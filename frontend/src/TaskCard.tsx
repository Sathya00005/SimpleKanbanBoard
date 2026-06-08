import type { Task } from "./types";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  return (
    <li className="kanban-card">
      <div className="kanban-card-header">
        <span className="kanban-card-id">#{task.id.slice(0, 6)}</span>
        <span className="kanban-card-status">{task.status}</span>
      </div>
      <h4 className="kanban-card-title">{task.name}</h4>
      {task.description && <p className="kanban-card-desc">{task.description}</p>}
      {task.testCases && task.testCases.length > 0 && (
        <div className="task-testcases">
          <strong>Test Cases</strong>
          <ul>
            {task.testCases.map((tc, index) => (
              <li key={index}>{tc}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}