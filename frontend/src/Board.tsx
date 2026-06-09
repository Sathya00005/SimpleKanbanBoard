import { useEffect, useState } from "react";
import "./Board.css";
import CreateTaskModal from "./CreateTaskModal";
import { DndContext, useDroppable, useDraggable, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
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

  /* Gated Modal States */
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleFormData, setScheduleFormData] = useState({ startDate: "", endDate: "", effortRequired: "" });

  const [deployingTask, setDeployingTask] = useState<Task | null>(null);
  const [deployFormData, setDeployFormData] = useState({ deployedTime: "", deploymentType: "feature_update" });

  /* Sensors prevent action button selection from accidentally initiating element dragging layouts */
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

  useEffect(() => { fetchTasks(); }, []);

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

      // Optimistically move layout card locally 
      setTasks(prev => prev.map(t => t.id === deployingTask.id ? { ...t, status: "Deployed" } : t));
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
    if (!task || (task as any).workStatus !== "Completed") {
      return alert("Task must be marked Completed before moving to Testing.");
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Testing" }),
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentIdx = COLUMNS.indexOf(task.status || "Backlog");
    const newIdx = COLUMNS.indexOf(newStatus);

    if (newIdx !== currentIdx + 1) {
      return alert("You can only move cards step-by-step.");
    }
    if (newStatus === "Testing" && (task as any).workStatus !== "Completed") {
      return alert("Complete work requirements before moving to Testing.");
    }
    if (newStatus === "Scheduled") {
      setSchedulingTask(task);
      return;
    }
    if (newStatus === "Deployed") {
      setDeployingTask(task);
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch {
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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="kanban-grid">
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col}
              title={col}
              tasks={tasks.filter(t => (t.status || "Backlog") === col)}
              onToggleWorkStatus={toggleWorkStatus}
              onMoveToTesting={moveToTesting}
            />
          ))}
        </div>
      </DndContext>

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={createTask} />

      {/* SCHEDULE INTERCEPTIVE MODAL */}
      {schedulingTask && (
        <div className="modal-overlay">
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
                <button type="button" onClick={() => setSchedulingTask(null)}>Cancel</button>
                <button type="submit">Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPLOYMENT INTERCEPTIVE MODAL */}
      {deployingTask && (
        <div className="modal-overlay">
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
                <button type="button" onClick={() => setDeployingTask(null)}>Cancel</button>
                <button type="submit">Complete Deployment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn({ title, tasks, onToggleWorkStatus, onMoveToTesting }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  return (
    <div ref={setNodeRef} className="kanban-column" style={{ borderColor: isOver ? "#2563eb" : "transparent" }}>
      <h3>{title}</h3>
      {tasks.map((t: Task) => (
        <DraggableCard key={t.id} task={t} onToggleWorkStatus={onToggleWorkStatus} onMoveToTesting={onMoveToTesting} />
      ))}
    </div>
  );
}

function DraggableCard({ task, onToggleWorkStatus, onMoveToTesting }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="kanban-card">
      <h4>{task.name}</h4>
      <p>{task.description}</p>

      {task.status === "Work In Progress" && (
        <div className="card-controls" onPointerDown={e => e.stopPropagation()}>
          <label>
            <input
              type="checkbox"
              checked={(task as any).workStatus === "Completed"}
              onChange={() => onToggleWorkStatus(task.id, task.workStatus)}
            />
            Completed
          </label>
          <button disabled={task.workStatus !== "Completed"} onClick={() => onMoveToTesting(task.id)}>
            Send to Testing
          </button>
        </div>
      )}
    </div>
  );
}