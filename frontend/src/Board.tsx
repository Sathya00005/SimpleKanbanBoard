import { useEffect, useState } from "react";
import "./Board.css";

interface Task {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  status?: string;
  columnStatus?: string;
}

interface BoardProps {
  setIsLoggedIn: (value: boolean) => void;
}

const COLUMNS = ['Backlog', 'Scheduled', 'Work In Progress', 'Testing', 'Deployed'];

export default function Board({ setIsLoggedIn }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [name, setName] = useState("");

  // GET TASKS
  const fetchTasks = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tasks");
      
      if (!res.ok) {
        throw new Error(`Failed to fetch tasks: ${res.statusText}`);
      }

      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // CREATE TASK
  const createTask = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMessage = "Failed to create task";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }

      setName("");
      fetchTasks();
    } catch (err) {
      console.error("Error creating task:", err);
      alert(err instanceof Error ? err.message : "Error creating task");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="board-container">
      <header className="board-header">
        <h2>Kanban Board</h2>
        <div className="board-controls">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name"
          />
          <button className="btn-primary" onClick={createTask}>Add Task</button>
          <button className="btn-secondary" onClick={() => setIsLoggedIn(false)}>Logout</button>
        </div>
      </header>

      <div className="kanban-grid">
        {COLUMNS.map((column) => (
          <div key={column} className="kanban-column">
            <h3>{column}</h3>
            <ul className="kanban-card-list">
              {tasks
                .filter((t) => (t.columnStatus || t.status || 'Backlog') === column)
                .map((t) => (
                  <li key={t.id} className="kanban-card">
                    <div className="kanban-card-header">
                      <span className="kanban-card-id">#{t.id ? t.id.toString().substring(0, 6) : 'NEW'}</span>
                      <span className="kanban-card-status">{t.columnStatus || t.status || 'Backlog'}</span>
                    </div>
                    <h4 className="kanban-card-title">{t.name || t.title}</h4>
                    {t.description && <p className="kanban-card-desc">{t.description}</p>}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}