import type { Task } from './types';

interface TaskDetailsModalProps {
  task: Task & {
    timeLogs?: Array<{ hoursSpent: number; description?: string; logDate?: string }>;
    history?: Array<{ createdAt: string; eventType: string; details: string }>;
  };
}

export default function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps & { onClose: () => void }) {
  const actualTimeHours = task.timeLogs?.reduce((sum: number, log: any) => sum + Number(log.hoursSpent || 0), 0) || 0;
  const scheduleInfo = task.startDate || task.endDate || task.effortRequired !== undefined;
  const deploymentInfo = task.deployedTime || task.deploymentType;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', padding: '20px', background: '#fff', borderRadius: '8px' }}>
        <h3>{task.name}</h3>
        <p style={{ marginTop: '8px' }}><strong>Description:</strong> {task.description || 'No description provided.'}</p>
        <p><strong>Status:</strong> {task.status}</p>
        {task.workStatus && <p><strong>Work Status:</strong> {task.workStatus}</p>}
        {scheduleInfo && (
          <p>
            <strong>Schedule:</strong> {task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'} to {task.endDate ? new Date(task.endDate).toLocaleDateString() : '—'}
            {task.effortRequired !== undefined ? ` · Effort: ${task.effortRequired} hrs` : ''}
          </p>
        )}
        {deploymentInfo && (
          <p>
            <strong>Deployment:</strong> {task.deployedTime ? new Date(task.deployedTime).toLocaleString() : 'Not deployed yet'}
            {task.deploymentType ? ` · Type: ${task.deploymentType}` : ''}
          </p>
        )}
        {task.testCases && task.testCases.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <strong>Test Cases:</strong>
            <ul style={{ marginTop: '6px', paddingLeft: '18px', fontSize: '12px' }}>
              {task.testCases.map((tc, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{tc}</li>
              ))}
            </ul>
          </div>
        )}

        <p style={{ marginTop: '10px' }}><strong>Total Effort Logged:</strong> {actualTimeHours.toFixed(1)} hours</p>

        <div style={{ marginTop: '18px' }}>
          <h4 style={{ marginBottom: '8px' }}>Time Log Entries</h4>
          <div style={{ maxHeight: '136px', overflowY: 'auto', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
            {task.timeLogs && task.timeLogs.length > 0 ? (
              task.timeLogs.map((log: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{log.logDate ? new Date(log.logDate).toLocaleString() : 'Unknown date'}</div>
                  <div style={{ fontSize: '13px' }}>⏱ {Number(log.hoursSpent).toFixed(1)} hrs — {log.description || 'No notes'}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>No time logs recorded yet.</p>
            )}
          </div>
        </div>

        <h4 style={{ marginTop: '16px', marginBottom: '8px' }}>History Logs</h4>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', padding: '8px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
          {task.history && task.history.length > 0 ? (
            task.history.map((log: any, idx: number) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid #f3f4f6', paddingBottom: '6px' }}>
                <div style={{ color: '#6b7280', marginBottom: '4px' }}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown date'}</div>
                <div><strong>{log.eventType}</strong> — {log.details}</div>
              </div>
            ))
          ) : (
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>No history logged yet.</p>
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '6px 12px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
