import { useEffect, useState } from "react";
import WipTaskModal from "./WipTaskModal"; 
import TestingTaskModal from "./TestingTaskModal";
import CreateTaskModal from "./CreateTaskModal";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskCard from "./TaskCard"; 
import "./Board.css";
import { DndContext, useDroppable, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
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
  const [activeTask, setActiveTask] = useState<Task | null>(null); 

  const [detailedTask, setDetailedTask] = useState<Task | null>(null);
  const [wipLogTask, setWipLogTask] = useState<Task | null>(null);
  const [testingGateTask, setTestingGateTask] = useState<Task | null>(null);

  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleFormData, setScheduleFormData] = useState({ startDate: "", endDate: "", effortRequired: "" });

  const [deployingTask, setDeployingTask] = useState<Task | null>(null);
  const [deployFormData, setDeployFormData] = useState({ deployedTime: "", deploymentType: "feature_update" });
  
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", description: "", testCasesString: "" });

  const [previousStatusCache, setPreviousStatusCache] = useState<string | null>(null);

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
      const freshTasks = await res.json();
      setTasks(freshTasks);

      if (detailedTask) {
        const syncDetail = freshTasks.find((t: Task) => t.id === detailedTask.id);
        if (syncDetail) setDetailedTask(syncDetail);
      }
      if (wipLogTask) {
        const syncWip = freshTasks.find((t: Task) => t.id === wipLogTask.id);
        setWipLogTask(syncWip || null);
      }
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
          startDate: scheduleFormData.startDate,
          endDate: scheduleFormData.endDate,
          effortRequired: Number(scheduleFormData.effortRequired)
        }),
      });
      if (!res.ok) throw new Error("Scheduling failed");
      setSchedulingTask(null);
      setPreviousStatusCache(null);
      setScheduleFormData({ startDate: "", endDate: "", effortRequired: "" });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleScheduleCancel = () => {
    if (schedulingTask && previousStatusCache) {
      setTasks(prev => prev.map(t => t.id === schedulingTask.id ? { ...t, status: previousStatusCache } : t));
    }
    setSchedulingTask(null);
    setPreviousStatusCache(null);
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
      setPreviousStatusCache(null);
      setDeployFormData({ deployedTime: "", deploymentType: "feature_update" });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeployCancel = () => {
    if (deployingTask && previousStatusCache) {
      setTasks(prev => prev.map(t => t.id === deployingTask.id ? { ...t, status: previousStatusCache } : t));
    }
    setDeployingTask(null);
    setPreviousStatusCache(null);
  };

  const openEditTask = (task: Task) => {
    setEditTask(task);
    setEditFormData({
      name: task.name,
      description: task.description || "",
      testCasesString: task.testCases ? task.testCases.join(", ") : ""
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;

    try {
      const testCasesArray = editFormData.testCasesString
        .split(",")
        .map(tc => tc.trim())
        .filter(tc => tc.length > 0);

      const payload: any = {
        name: editFormData.name,
        description: editFormData.description,
        testCases: testCasesArray 
      };

      const res = await fetch(`${API_BASE_URL}/api/tasks/${editTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to edit task");

      setEditTask(null);
      fetchTasks();
    } catch (error) {
      console.error(error);
      alert("Unable to save task edits.");
    }
  };

  const logout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
  };

  const toggleWorkStatus = async (taskId: string, current?: string) => {
    const newStatus = current === "Completed" ? "Pending" : "Completed";
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus: newStatus }),
      });
      
      if (res.ok) {
        fetchTasks();
      }
    } catch {
      await fetchTasks();
    }
  };

  const moveToTesting = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.workStatus !== "Completed") {
      return alert("Task must be marked Completed before moving to Testing.");
    }
    setTestingGateTask({ ...task, testCases: task.testCases ?? [] });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => String(t.id) === taskId);
    if (!task) return;

    const overId = String(over.id);
    
    let destinationStatus: string | undefined = undefined;
    if (COLUMNS.includes(overId)) {
      destinationStatus = overId;
    } else {
      const overTask = tasks.find((t) => String(t.id) === overId);
      destinationStatus = overTask?.status;
    }

    if (!destinationStatus || !COLUMNS.includes(destinationStatus)) return;

    const currentStatus = task.status || "Backlog";
    const currentIdx = COLUMNS.indexOf(currentStatus);
    const destinationIdx = COLUMNS.indexOf(destinationStatus);

    if (destinationStatus === currentStatus) return;

    if (destinationIdx < currentIdx) {
      alert("Invalid Action: You cannot manually drag items backward in the workflow sequence.");
      return;
    }

    if (destinationIdx > currentIdx + 1) {
      alert("You can only move cards step-by-step.");
      return;
    }

    setPreviousStatusCache(currentStatus);

    if (destinationStatus === "Scheduled") {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "Scheduled" } : t)));
      setSchedulingTask(task);
      return;
    }

    if (destinationStatus === "Testing") {
      if (task.workStatus !== "Completed") {
        alert("Complete work requirements before moving to Testing.");
        fetchTasks();
        return;
      }
      setTestingGateTask({ ...task, testCases: task.testCases ?? [] });
      return;
    }

    if (destinationStatus === "Deployed") {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "Deployed" } : t)));
      setDeployingTask(task);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destinationStatus }),
      });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
      fetchTasks();
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
              onSelectTaskForDetails={setDetailedTask}
              onEditTask={openEditTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={createTask} />

      {detailedTask && (
        <TaskDetailsModal task={detailedTask} onClose={() => setDetailedTask(null)} />
      )}

      {wipLogTask && (
        <WipTaskModal 
          task={wipLogTask} 
          onClose={() => setWipLogTask(null)} 
          onUpdate={() => { fetchTasks(); }} 
        />
      )}

      {testingGateTask && (
        <TestingTaskModal 
          task={testingGateTask}
          onClose={() => { fetchTasks(); setTestingGateTask(null); }}
          onUpdate={() => { fetchTasks(); setTestingGateTask(null); }}
        />
      )}

      {editTask && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
            <h3>Edit Task: {editTask.name}</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Task Name</label>
                <input type="text" required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Test Cases (Separate with commas)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Unit Integration Test, Regression Test"
                  value={editFormData.testCasesString} 
                  onChange={(e) => setEditFormData({ ...editFormData, testCasesString: e.target.value })} 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditTask(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {schedulingTask && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
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
                <button type="button" className="btn-secondary" onClick={handleScheduleCancel}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deployingTask && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
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
                <button type="button" className="btn-secondary" onClick={handleDeployCancel}>Cancel</button>
                <button type="submit" className="btn-primary">Complete Deployment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn({ title, tasks, onToggleWorkStatus, onMoveToTesting, onSelectTaskForLog, onSelectTaskForTesting, onSelectTaskForDetails, onEditTask }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  const columnItems = tasks.map((t: Task) => String(t.id));

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
              onSelectTaskForDetails={onSelectTaskForDetails}
              onEditTask={onEditTask}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableCard({ task, onToggleWorkStatus, onMoveToTesting, onSelectTaskForLog, onSelectTaskForTesting, onSelectTaskForDetails, onEditTask }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, 
  };

  const actualTimeHours = task.timeLogs?.reduce((sum: number, log: any) => sum + Number(log.hoursSpent || 0), 0) || 0;

  return (
    <div ref={setNodeRef} style={style} className="kanban-card-wrapper">
      <div className="card-drag-handle-wrapper" {...listeners} {...attributes}>
        <TaskCard task={task} />
      </div>

      <div className="card-interactive-actions-overlay" onPointerDown={e => e.stopPropagation()}>
        <div style={{ padding: "0 12px 12px 12px", marginTop: "-4px" }}>
          {actualTimeHours > 0 && (
            <div style={{ fontSize: "11px", color: "#4b5563", marginBottom: "6px", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", display: "inline-block" }}>
              ⏱️ Logged: {actualTimeHours.toFixed(1)} hrs
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => onSelectTaskForDetails(task)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", cursor: "pointer", padding: "4px 0", fontWeight: 500 }}>
              🔎 View Details & History
            </button>
            <button type="button" onClick={() => onEditTask(task)} style={{ background: "none", border: "none", color: "#10b981", fontSize: "12px", cursor: "pointer", padding: "4px 0", fontWeight: 500 }}>
              ✏️ Edit Task
            </button>
            {/* ✅ FIXED: Trigger condition verifies status bounds dynamically */}
            {task.status === "Work In Progress" && (
              <button type="button" onClick={() => onSelectTaskForLog(task)} style={{ background: "none", border: "none", color: "#ea580c", fontSize: "12px", cursor: "pointer", padding: "4px 0", fontWeight: 600 }}>
                ⏱️ Log WIP Effort
              </button>
            )}
          </div>
        </div>

        {task.status === "Work In Progress" && (
          <div className="card-controls" style={{ padding: "0 12px 12px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "12px" }}>
              <input type="checkbox" checked={task.workStatus === "Completed"} onChange={() => onToggleWorkStatus(task.id, task.workStatus)} />
              Completed
            </label>
            <button disabled={task.workStatus !== "Completed"} onClick={() => onMoveToTesting(task.id)} style={{ fontSize: "11px", padding: "4px 8px" }}>
              Send to Testing
            </button>
          </div>
        )}

        {task.status === "Testing" && (
          <div className="card-controls" style={{ padding: "0 12px 12px 12px" }}>
            <button className="btn-primary" onClick={() => onSelectTaskForTesting(task)} style={{ fontSize: "11px", padding: "4px 8px", width: "100%" }}>
              Log Test Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}