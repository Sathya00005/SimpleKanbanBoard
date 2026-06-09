import { useEffect, useState } from "react";
import "./Board.css";
import CreateTaskModal from "./CreateTaskModal";
import { DndContext, useDroppable, useDraggable, closestCorners } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "./types";

interface BoardProps {
  setIsLoggedIn: (value: boolean) => void;
}

const COLUMNS = [
  "Backlog",
  "Scheduled",
  "Work In Progress",
  "Testing",
  "Deployed",
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function Board({
  setIsLoggedIn,
}: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] =
    useState(false);
  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleFormData, setScheduleFormData] = useState({ startDate: "", endDate: "", effortRequired: "" });

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  /* ---------------- FETCH TASKS ---------------- */

  const fetchTasks = async () => {
    try {
      if (!userId) return;

      const res = await fetch(
        `${API_BASE_URL}/api/tasks/${userId}`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error(
        "Error fetching tasks:",
        error
      );
    }
  };

  /* ---------------- CREATE TASK ---------------- */

  const createTask = async (taskData: {
    name: string;
    description: string;
    testCases: string[];
  }) => {
    try {
      if (!userId) {
        alert("Please login again");
        return;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: taskData.name,
            description:
              taskData.description,
            testCases:
              taskData.testCases,
            userId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to create task"
        );
      }

      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create task"
      );
    }
  };

  /* ---------------- LOGOUT ---------------- */

  const logout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");

    setIsLoggedIn(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  /* ---------------- TASK SORTING ---------------- */
  const getSortedTasksForColumn = (column: string) => {
    const columnTasks = tasks.filter((task) => (task.status || "Backlog") === column);
    
    if (column === "Backlog") {
      // Sort Priority: Oldest Failed -> Newest Failed -> New Task
      columnTasks.sort((a, b) => {
        if (a.failedAt && b.failedAt) {
          return new Date(a.failedAt).getTime() - new Date(b.failedAt).getTime();
        }
        if (a.failedAt) return -1;
        if (b.failedAt) return 1;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
    }
    return columnTasks;
  };

  /* ---------------- DRAG AND DROP ---------------- */

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || (task.status || "Backlog") === newStatus) return;

    // Optimistic UI Update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    // Gated Transition: Backlog -> Scheduled
    if (newStatus === "Scheduled" && (task.status || "Backlog") === "Backlog") {
      setSchedulingTask(task);
      return; // Wait for modal submission before hitting the API
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status on server");
    } catch (error) {
      console.error("Drag and Drop Error:", error);
      fetchTasks(); // Revert on failure
    }
  };

  const handleScheduleSubmit = async () => {
    if (!schedulingTask) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${schedulingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Scheduled",
          startDate: new Date(scheduleFormData.startDate).toISOString(),
          endDate: new Date(scheduleFormData.endDate).toISOString(),
          effortRequired: parseInt(scheduleFormData.effortRequired, 10),
        }),
      });
      if (!res.ok) throw new Error("Failed to schedule task");
      setSchedulingTask(null);
      setScheduleFormData({ startDate: "", endDate: "", effortRequired: "" });
    } catch (error) {
      console.error("Scheduling Error:", error);
      // Revert optimistic update on error
      setTasks((prev) => prev.map((t) => (t.id === schedulingTask.id ? { ...t, status: schedulingTask.status || "Backlog" } : t)));
      setSchedulingTask(null);
    }
  };

  const handleScheduleCancel = () => {
    if (!schedulingTask) return;
    // Revert optimistic UI on cancel
    setTasks((prev) => prev.map((t) => (t.id === schedulingTask.id ? { ...t, status: schedulingTask.status || "Backlog" } : t)));
    setSchedulingTask(null);
    setScheduleFormData({ startDate: "", endDate: "", effortRequired: "" });
  };

  return (
    <div className="board-container">
      <header className="board-header">
        <div>
          <h2>Kanban Board</h2>
          <p>
            Welcome, {username}
          </p>
        </div>

        <div className="board-controls">
          <button
            className="btn-primary"
            onClick={() =>
              setIsModalOpen(true)
            }
          >
            + Create Task
          </button>

          <button
            className="btn-secondary"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="kanban-grid">
          {COLUMNS.map((column) => (
            <DroppableColumn 
              key={column} 
              title={column} 
              tasks={getSortedTasksForColumn(column)} 
            />
          ))}
        </div>
      </DndContext>

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() =>
          setIsModalOpen(false)
        }
        onSubmit={createTask}
      />
    </div>
  );
}

/* ---------------- DND COMPONENTS ---------------- */

function DroppableColumn({ title, tasks }: { title: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: title });
  return (
    <div 
      ref={setNodeRef} 
      className="kanban-column"
      style={{ border: isOver ? "2px dashed #2563eb" : "2px solid transparent" }}
    >
      <h3>{title}</h3>
      {tasks.map((t) => (
        <DraggableCard key={t.id} task={t} />
      ))}
    </div>
  );
}

function DraggableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  
  const style = transform ? { 
    transform: CSS.Translate.toString(transform),
    zIndex: 999,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="kanban-card">
      <div className="kanban-card-header">
        <span className="kanban-card-status">{task.status || "Backlog"}</span>
      </div>
      <h4 className="kanban-card-title">{task.name}</h4>
      <p className="kanban-card-desc">{task.description}</p>
    </div>
  );
}