// 🔽 CHANGE THE VERY FIRST LINE FROM: import React from 'react'; TO THIS:
import type { Task } from './types';

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps) {
  const originalEstimate = task.effortRequired ? Number(task.effortRequired) : 0;
  
  let actualTimeHours = 0;
  if (task.timeLogs && Array.isArray(task.timeLogs)) {
    task.timeLogs.forEach((log: any) => {
      if (log.hoursSpent) {
        actualTimeHours += Number(log.hoursSpent);
      }
    });
  }

  const remainingTime = originalEstimate - actualTimeHours;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        onPointerDown={e => e.stopPropagation()} 
        style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}
      >
        <h3>Task Details: {task.name}</h3>
        <p><strong>Description:</strong> {task.description}</p>
        <p><strong>Status:</strong> {task.status || "Backlog"}</p>
        
        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <h4>Time Tracking Baseline</h4>
          <p><strong>Original Estimate:</strong> {originalEstimate.toFixed(2)} hrs</p>
          <p><strong>Actual Time Spent:</strong> {actualTimeHours.toFixed(2)} hrs</p>
          <p><strong>Remaining Time:</strong> <span style={{ color: remainingTime < 0 ? 'red' : 'green' }}>{remainingTime.toFixed(2)} hrs</span></p>
        </div>

        <div style={{ marginTop: '16px' }}>
          <h4>History Timeline</h4>
          {task.history && Array.isArray(task.history) && task.history.length > 0 ? (
            <ul style={{ paddingLeft: '20px', fontSize: '14px' }}>
              {task.history.map((entry: any, i: number) => {
                let badgeColor = "#4b5563";
                if (entry.eventType === "TEST_PASSED") badgeColor = "green";
                if (entry.eventType === "TEST_FAILED") badgeColor = "red";
                if (entry.eventType === "TEST_RUN") badgeColor = "#2563eb";

                return (
                  <li key={i} style={{ marginBottom: '12px', borderLeft: `3px solid ${badgeColor}`, paddingLeft: '8px' }}>
                    <strong>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}</strong> - 
                    <span style={{ color: badgeColor, fontWeight: 600, marginLeft: '4px' }}>[{entry.eventType}]</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#1f2937' }}>
                      {entry.details}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>No history entries available.</p>
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn-secondary" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
