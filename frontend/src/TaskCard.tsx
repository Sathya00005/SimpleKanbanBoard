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
  if (status !== "IN_PROGRESS") return null;
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

  const hasValidationItems =
    (task.acceptanceCriteria?.length || 0) > 0 ||
    (task.positiveTestCases?.length || 0) > 0 ||
    (task.negativeTestCases?.length || 0) > 0 ||
    (task.edgeCases?.length || 0) > 0 ||
    (task.definitionOfDone?.length || 0) > 0;

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

      <div className="task-card-metrics">
        <div className="metric-badge">
          <span className="metric-icon">Est:</span> {scheduledEffort}h
        </div>
        <div className={`metric-badge ${wipState === 'overtime' ? 'overtime' : ''}`}>
          <span className="metric-icon">Log:</span> {totalActualEffort}h
        </div>
      </div>
    </li>
  );
}
                className="task-label-chip"
                style={{
                  borderColor: labelColor,
                  color: "#0f172a",
                  backgroundColor: `${labelColor}22`,
                }}
                title={label.description || label.name}
              >
                {label.name}
              </span>
            );
          })}
        </div>
      )}

      {task.description && (
        <p
          className="kanban-card-description"
          style={{
            fontSize: '12px',
            color: '#475569',
            margin: '6px 0 8px 0',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {task.description}
        </p>
      )}

      {hasValidationItems && (
        <div
          className="task-validation-summaries-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            margin: '8px 0',
            fontSize: '11px',
            color: '#475569',
            background: '#f8fafc',
            padding: '8px',
            borderRadius: '4px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontWeight: '600' }}>
            {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && <span>AC: {task.acceptanceCriteria.length}</span>}
            {task.positiveTestCases && task.positiveTestCases.length > 0 && <span>PTC: {task.positiveTestCases.length}</span>}
            {task.negativeTestCases && task.negativeTestCases.length > 0 && <span>NTC: {task.negativeTestCases.length}</span>}
            {task.edgeCases && task.edgeCases.length > 0 && <span>EC: {task.edgeCases.length}</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <span style={{ color: '#16a34a' }}>Passed: {passedCount}</span>
            <span style={{ color: '#dc2626' }}>Failed: {failedCount}</span>
            <span style={{ color: '#ca8a04' }}>Pending: {pendingCount}</span>
          </div>
        </div>
      )}

      {failedCount > 0 && (
        <div className="task-failure-reason" style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px' }}>
          <strong>Failing validations detected</strong>
        </div>
      )}

      <div className="task-card-metrics" style={{ marginTop: '12px' }}>
        <div className="metric-badge budgeted" title="Scheduled Effort">
          <span className="metric-icon">⏱️</span>
          <span>Est: {scheduledEffort}h</span>
        </div>
        <div
          className={`metric-badge logged ${
            totalActualEffort > scheduledEffort ? 'overtime' : ''
          }`}
        >
          <span className="metric-icon">⏳</span>
          <span>Logged: {totalActualEffort}h</span>
        </div>
      </div>

      {/* ── WIP colour-state indicator banners ── */}
      {wipState === "overtime" && (
        <div
          className="wip-overtime-block"
          style={{
            marginTop: '10px',
            padding: '8px 10px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
          }}
        >
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', margin: '0 0 6px 0' }}>
            ⚠ Overtime — logged {totalActualEffort}h exceeds estimate {scheduledEffort}h
          </p>
          <label
            htmlFor={`overtime-reason-${task.id}`}
            style={{ fontSize: '11px', fontWeight: '600', color: '#b91c1c', display: 'block', marginBottom: '4px' }}
          >
            Reason (required):
          </label>
          <textarea
            id={`overtime-reason-${task.id}`}
            rows={2}
            placeholder="Explain why this task went over the allocated effort..."
            value={overtimeReason}
            onChange={(e) => setOvertimeReason(e.target.value)}
            style={{
              width: '100%',
              fontSize: '11px',
              padding: '4px 6px',
              borderRadius: '4px',
              border: overtimeReason.trim() ? '1px solid #fca5a5' : '2px solid #dc2626',
              background: '#fff',
              color: '#1e293b',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          {!overtimeReason.trim() && (
            <p style={{ fontSize: '10px', color: '#dc2626', margin: '3px 0 0 0' }}>
              A reason is required before continuing.
            </p>
          )}
        </div>
      )}

      {wipState === "on-track" && (
        <div
          style={{
            marginTop: '10px',
            padding: '6px 10px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            color: '#15803d',
          }}
        >
          ✓ On track — effort matches estimate exactly
        </div>
      )}

      {wipState === "under-budget" && (
        <div
          style={{
            marginTop: '10px',
            padding: '6px 10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          ○ Under budget — {totalActualEffort}h of {scheduledEffort}h used
        </div>
      )}
    </li>
  );
}
