import type { Task } from "./types";
import "./taskcard.css"; 

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const totalActualEffort = task.timeLogs?.reduce((sum, log) => sum + (log.hoursSpent || 0), 0) || 0;
  const scheduledEffort = task.effortRequired || 0;

  const statusClass = task.status?.toLowerCase().replace(/\s+/g, '-');

  return (
    <li className="kanban-card">
      <div className="kanban-card-header">
        <span className="kanban-card-id"></span>
        {/* Dynamic status label badges mapping custom light theme profiles */}
        <span className={`kanban-card-status status-${statusClass}`}>
          {task.status || "Backlog"}
        </span>
      </div>
      
      <h4 className="kanban-card-title">{task.name}</h4>
      {task.description && <p className="kanban-card-desc">{task.description}</p>}
      
      {task.testCases && task.testCases.length > 0 && (
        <div className="task-testcases">
          <strong className="task-testcases-title">🔬 Required Pipeline Tests:</strong>
          <ul className="task-testcases-list">
            {task.testCases.map((tc, index) => (
              <li key={index} className="task-testcases-item">{tc}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="task-card-metrics">
        <div className="metric-badge budgeted" title="Scheduled Effort">
          <span className="metric-icon">⏱️</span>
          <span>Est: {scheduledEffort}h</span>
        </div>
        <div className={`metric-badge logged ${totalActualEffort > scheduledEffort ? 'overtime' : ''}`}>
          <span className="metric-icon">⏳</span>
          <span>Logged: {totalActualEffort}h</span>
        </div>
      </div>
    </li>
  );
}