import { useEffect, useState } from "react";
import "./Board.css";
import CreateTaskModal from "./CreateTaskModal";
import Column from "./Column";
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

      <div className="kanban-grid">
        {COLUMNS.map((column) => (
          <Column 
            key={column} 
            title={column} 
            tasks={getSortedTasksForColumn(column)} 
          />
        ))}
      </div>

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