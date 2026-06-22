import { useState } from "react";
import type { Task } from './types';
import './taskcard.css';

interface TaskCardProps {
  task: Task;
  onClose?: () => void;
}

function normalizeValue(value?: string) {
  return (value || '').toLowerCase().replace(/\s+/g, '-');
}

function normalizeHexColor(color?: string) {
  if (!color) return "#e2e8f0";
  const trimmed = color.trim();
  if (!trimmed) return "#e2e8f0";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

// Derives the WIP background color state for IN_PROGRESS tasks only.
// Returns null for any other status so colours never bleed into Backlog/Todo.
type WipColorState = "overtime" | "on-track" | "under-budget" | null;

function getWipColorState(
  status: string,
  logged: number,
  allocated: number
): WipColorState {
  const norm = (status || "").toLowerCase().trim().replace(/\s+/g, '-');
  if (norm !== "in-progress" && norm !== "work-in-progress" && norm !== "wip") return null;
  if (allocated <= 0) return null; // No estimate → no colour signal
  if (logged > allocated) return "overtime";
  if (logged === allocated) return "on-track";
  return "under-budget";
}

const WIP_BG: Record<Exclude<WipColorState, null>, string> = {
  "overtime":     "#fee2e2",
  "on-track":     "#dcfce7",
  "under-budget": "#f8f9fb",
};

const WIP_BORDER: Record<Exclude<WipColorState, null>, string> = {
  "overtime":     "#fca5a5",
  "on-track":     "#86efac",
  "under-budget": "#e2e8f0",
};

export default function TaskCard({ task }: TaskCardProps) {
  const [overtimeReason, setOvertimeReason] = useState<string>(
    task.overtimeReason || ""
  );

  const totalActualEffort =
    task.timeLogs?.reduce((sum, log) => sum + (log.hoursSpent || 0), 0) || 0;
  const scheduledEffort = task.effortRequired || 0;
  const statusClass = normalizeValue(task.status);
  const wipState = getWipColorState(task.status, totalActualEffort, scheduledEffort);

  const allValidationItems = [
    ...(task.acceptanceCriteria || []),
    ...(task.positiveTestCases || []),
    ...(task.negativeTestCases || []),
    ...(task.edgeCases || []),
    ...(task.definitionOfDone || []),
  ];

  const passedCount = allValidationItems.filter(i => i.status?.toLowerCase() === 'passed').length;
  const failedCount = allValidationItems.filter(i => i.status?.toLowerCase() === 'failed').length;
  const pendingCount = allValidationItems.filter(i => i.status?.toLowerCase() === 'pending').length;

  const cardStyle = wipState
    ? { backgroundColor: WIP_BG[wipState], borderColor: WIP_BORDER[wipState], borderWidth: "1px", borderStyle: "solid" as const }
    : {};

  return (
    <li className="kanban-card" style={cardStyle}>
      <div className="kanban-card-header">
        <span className={`kanban-card-status status-${statusClass}`}>
          {task.status || 'Backlog'}
        </span>
        {allValidationItems.length > 0 && (
          <div className="validation-summary-badge" title={`Passed: ${passedCount}, Failed: ${failedCount}, Pending: ${pendingCount}`}>
            {passedCount}✓ {failedCount > 0 && `${failedCount}✗`}
          </div>
        )}
      </div>

      <h4 className="kanban-card-title">{task.name}</h4>

      {Array.isArray(task.labels) && task.labels.length > 0 && (
        <div className="task-labels-row" aria-label="GitHub labels">
          {task.labels.map((label, index) => {
            const labelColor = normalizeHexColor(label.color);
            return (
              <span
                key={`${label.name}-${index}`}
                className="task-label-chip"
                style={{
                  backgroundColor: `${labelColor}15`,
                  borderColor: labelColor,
                  color: labelColor
                }}
              >
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      {task.description && (
        <p className="kanban-card-description" style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '8px 0', lineHeight: '1.4' }}>
          {task.description.length > 100 ? `${task.description.substring(0, 100)}...` : task.description}
        </p>
      )}

      <div className="task-card-metrics">
        <div className="metric-badge">
          <span className="metric-icon">Est:</span> {scheduledEffort}h
        </div>
        <div className={`metric-badge ${wipState === 'overtime' ? 'overtime' : ''}`}>
          <span className="metric-icon">Log:</span> {totalActualEffort}h
        </div>
      </div>

      {wipState === "overtime" && (
        <div className="wip-overtime-entry" style={{ marginTop: '8px' }}>
           <textarea
            style={{ width: '100%', fontSize: '11px', padding: '4px', borderRadius: '4px', border: '1px solid #fca5a5' }}
            placeholder="Reason for overtime..."
            value={overtimeReason}
            onChange={(e) => setOvertimeReason(e.target.value)}
          />
        </div>
      )}
    </li>
  );
}
