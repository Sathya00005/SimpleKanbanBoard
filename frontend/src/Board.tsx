import { useEffect, useState } from "react";
import WipTaskModal from "./WipTaskModal"; 
import TestingTaskModal from "./TestingTaskModal";
import CreateTaskModal from "./CreateTaskModal";
import "./Board.css";
// Added DragOverlay component to fix the drag lockup bug
import { DndContext, useDroppable, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "./types";

interface BoardProps {
  setIsLoggedIn: (value: boolean) => void;
}

const COLUMNS = ["Backlog", "Scheduled", "Work In Progress", "Testing", "Deployed"];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function Board({ setIsLoggedIn }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null); // Track currently dragged item

  /* Sprint 4 Interactive Gating Overlay States */
  const [wipLogTask, setWipLogTask] = useState<Task | null>(null);
  const [testingGateTask, setTestingGateTask] = useState<Task | null>(null);

  /* Core Transition Interceptive Modal States */
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleFormData, setScheduleFormData] = useState({ startDate: "", endDate: "", effortRequired: "" });

  const [deployingTask, setDeployingTask] = useState<Task | null>(null);
  const [deployFormData, setDeployFormData] = useState({ deployedTime: "", deploymentType: "feature_update" });

  /* Sensors prevent child buttons from triggering unexpected item drag events */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 80, tolerance: 5 } })
  );

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  const fetchTasks = async () => {
    try {
      if (!userId) return;
      const res = await fetch(`${API_BASE_URL}/api/tasks/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      setTasks(await res.json());
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async (taskData: { name: string; description: string }) => {
    try {
      if (!userId) return alert("Please login again");
      const res = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskData, userId }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTask) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${schedulingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Scheduled",
          ...scheduleFormData
        }),
      });
      if (!res.ok) throw new Error("Scheduling failed");
      setSchedulingTask(null);
      setScheduleFormData({ startDate: "", endDate: "", effortRequired: "" });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployingTask) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${deployingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Deployed",
          deployedTime: deployFormData.deployedTime,
          deploymentType: deployFormData.deploymentType
        }),
      });
      if (!res.ok) throw new Error("Deployment failed");

      setDeployingTask(null);
      setDeployFormData({ deployedTime: "", deploymentType: "feature_update" });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const logout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
  };

  const toggleWorkStatus = async (taskId: string, current?: string) => {
    const newStatus = current === "Completed" ? "Pending" : "Completed";
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, workStatus: newStatus } : t));
    try {
      await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus: newStatus }),
      });
    } catch {
      fetchTasks();
    }
  };

  const moveToTesting = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.workStatus !== "Completed") {
      return alert("Task must be marked Completed before moving to Testing.");
    }
    setTestingGateTask(task);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null); // Clear active item cache
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // 1. Correctly isolate the destination status
    let newStatus = overId;
    const overTask = tasks.find(t => t.id === overId);
    
    if (overTask) {
      newStatus = overTask.status || "Backlog";
    }

    // Safeguard: If the destination string isn't part of our tracking columns array, reject it
    if (!COLUMNS.includes(newStatus)) return;

    const currentStatus = task.status || "Backlog";
    const currentIdx = COLUMNS.indexOf(currentStatus);
    const newIdx = COLUMNS.indexOf(newStatus);

    // 2. Handle Intra-Column Sorting (Moving cards up/down in the same lane)
    if (currentStatus === newStatus) {
      if (taskId !== overId) {
        setTasks((prevTasks) => {
          const oldIndex = prevTasks.findIndex((t) => t.id === taskId);
          const newIndex = prevTasks.findIndex((t) => t.id === overId);
          return arrayMove(prevTasks, oldIndex, newIndex);
        });
      }
      return;
    }

    // 3. Handle Strict Step-by-Step Transition Validation Gating
    if (newIdx !== currentIdx + 1) {
      return alert("You can only move cards step-by-step.");
    }

    // 4. Intercept target phases to bring up data forms
    if (newStatus === "Scheduled") {
      setSchedulingTask(task);
      return;
    }
    if (newStatus === "Testing") {
      if (task.workStatus !== "Completed") {
        return alert("Complete work requirements before moving to Testing.");
      }
      setTestingGateTask(task);
      return;
    }
    if (newStatus === "Deployed") {
      setDeployingTask(task);
      return;
    }

    // 5. Normal workflow updates (e.g., Scheduled -> Work In Progress)
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to move card smoothly:", error);
      fetchTasks(); // Snaps card back into place locally on network error
    }
  };

  return (
    <div className="board-container">
      <header className="board-header">
        <div>
          <h2>Kanban Board</h2>
          <p>Welcome, {username}</p>
        </div>
        <div className="board-controls">
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Create Task</button>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="kanban-grid">
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col}
              title={col}
              tasks={tasks.filter(t => (t.status || "Backlog") === col)}
              onToggleWorkStatus={toggleWorkStatus}
              onMoveToTesting={moveToTesting}
              onSelectTaskForLog={setWipLogTask}
              onSelectTaskForTesting={setTestingGateTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="kanban-card dragging-clone" style={{ opacity: 0.8, transform: 'scale(1.02)' }}>
              <div className="card-drag-handle">
                <h4>{activeTask.name}</h4>
                <div className="drag-indicator">⋮⋮</div>
              </div>
              <div className="card-body-content">
                <p>{activeTask.description}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={createTask} />

      {wipLogTask && (
        <WipTaskModal 
          task={wipLogTask} 
          onClose={() => setWipLogTask(null)} 
          onUpdate={() => { 
            fetchTasks(); 
            setWipLogTask(null); 
          }} 
        />
      )}

      {testingGateTask && (
        <TestingTaskModal 
          task={testingGateTask}
          onClose={() => setTestingGateTask(null)}
          onUpdate={() => {
            fetchTasks();
            setTestingGateTask(null);
          }}
        />
      )}

      {/* SCHEDULE MODAL */}
      {schedulingTask && (
        /* ✅ ADDED POINTER INTERCEPTION: Prevents DnD engine layout hooks from blocking inputs */
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content" onPointerDown={e => e.stopPropagation()}>
            <h3>Schedule Task: {schedulingTask.name}</h3>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" required value={scheduleFormData.startDate} onChange={e => setScheduleFormData({...scheduleFormData, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" required value={scheduleFormData.endDate} onChange={e => setScheduleFormData({...scheduleFormData, endDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Effort Needed (Hours)</label>
                <input type="number" required value={scheduleFormData.effortRequired} onChange={e => setScheduleFormData({...scheduleFormData, effortRequired: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setSchedulingTask(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPLOYMENT MODAL */}
      {deployingTask && (
        /* ✅ ADDED POINTER INTERCEPTION: Guarantees text fields and selectors remain interactive */
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content" onPointerDown={e => e.stopPropagation()}>
            <h3>Deploy Task: {deployingTask.name}</h3>
            <form onSubmit={handleDeploySubmit}>
              <div className="form-group">
                <label>Release Timestamp</label>
                <input type="datetime-local" required value={deployFormData.deployedTime} onChange={e => setDeployFormData({...deployFormData, deployedTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Deployment Classification</label>
                <select value={deployFormData.deploymentType} onChange={e => setDeployFormData({...deployFormData, deploymentType: e.target.value})}>
                  <option value="feature_update">Feature Release</option>
                  <option value="bug_fix">Bug Fix</option>
                  <option value="hotfix">Urgent Hotfix</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setDeployingTask(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Complete Deployment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn({ title, tasks, onToggleWorkStatus, onMoveToTesting, onSelectTaskForLog, onSelectTaskForTesting }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  
  // ✅ DRAG-DROP FIX: Combines task IDs with the column container ID so @dnd-kit recognizes
  // the entire column as a valid drop zone, enabling drops to empty columns and container zones
  const columnItems = [...tasks.map((t: Task) => t.id), title];

  return (
    <div ref={setNodeRef} className="kanban-column" style={{ borderColor: isOver ? "#2563eb" : "transparent" }}>
      <h3>{title}</h3>
      <SortableContext items={columnItems} strategy={verticalListSortingStrategy}>
        <div className="column-cards-container" style={{ minHeight: "200px", width: "100%" }}>
          {tasks.map((t: Task) => (
            <DraggableCard 
              key={t.id} 
              task={t} 
              onToggleWorkStatus={onToggleWorkStatus} 
              onMoveToTesting={onMoveToTesting} 
              onSelectTaskForLog={onSelectTaskForLog} 
              onSelectTaskForTesting={onSelectTaskForTesting}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableCard({ task, onToggleWorkStatus, onMoveToTesting, onSelectTaskForLog, onSelectTaskForTesting }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, 
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="kanban-card"
      onDoubleClick={() => {
        if (task.status === "Work In Progress") {
          onSelectTaskForLog(task);
        }
      }}
    >
      <div className="card-drag-handle" {...listeners} {...attributes}>
        <h4>{task.name}</h4>
        <div className="drag-indicator">⋮⋮</div>
      </div>

      <div className="card-body-content">
        <p>{task.description}</p>
      </div>

      {task.status === "Work In Progress" && (
        <div className="card-controls" onPointerDown={e => e.stopPropagation()}>
          <label>
            <input
              type="checkbox"
              checked={task.workStatus === "Completed"}
              onChange={() => onToggleWorkStatus(task.id, task.workStatus)}
            />
            Completed
          </label>
          <button disabled={task.workStatus !== "Completed"} onClick={() => onMoveToTesting(task.id)}>
            Send to Testing
          </button>
        </div>
      )}

      {task.status === "Testing" && (
        <div className="card-controls" onPointerDown={e => e.stopPropagation()}>
          <button className="btn-primary" onClick={() => onSelectTaskForTesting(task)}>
            Log Test Results
          </button>
        </div>
      )}
    </div>
  );
}