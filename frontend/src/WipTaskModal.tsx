import React, { useState } from 'react';
import axios from 'axios';
import type { Task } from './types';
import './WipTakModal.css';

interface WipTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
  onToggleWorkStatus: (id: string, currentStatus?: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function WipTaskModal({ 
  task, 
  onClose, 
  onUpdate, 
  onToggleWorkStatus 
}: WipTaskModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(task.workStatus || 'Pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setStatus(task.workStatus || 'Pending');
  }, [task.workStatus]);

  const totalLogged = task.timeLogs?.reduce((sum, log) => sum + (log.hoursSpent || 0), 0) || 0;
  const estimatedHours = task.effortRequired || 0;

  // --- Dynamic Card Color Logic ---
  let budgetClass = 'card-under-budget'; // Under Budget (Yellow/Neutral default)
  
  if (totalLogged > estimatedHours) {
    budgetClass = 'card-over-budget';  // Over Budget (Red)
  } else if (totalLogged === estimatedHours && estimatedHours > 0) {
    budgetClass = 'card-equal-budget'; // Equal to Budget (Green)
  }

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = parseFloat(hours);
    
    if (isNaN(parsedHours) || parsedHours <= 0) {
      return alert('Please enter valid hours worked');
    }
    
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/tasks/${task.id}/time-logs`, {
        taskId: task.id,
        hoursSpent: parsedHours,
        description: description,
        logDate: new Date(date).toISOString()
      });

      alert('Time logged successfully!');
      setHours('');
      setDescription('');
      onUpdate(); 
    } catch (error) {
      console.error('Failed to log time', error);
      alert('Error saving time log to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await onToggleWorkStatus(task.id, status);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Error updating status.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${budgetClass}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        {/* Header Block */}
        <div className="modal-header">
          <span className="modal-task-id">#{task.id ? task.id.slice(-6) : "------"}</span>
          <h2>{task.name}</h2>
          <span className="modal-status-badge">{task.status}</span>
        </div>

        {/* Scrollable Middle Container (Class synchronized with CSS) */}
        <div className="modal-body-wrapper">
          
          {/* Scrollable Description Container */}
          <div className="modal-desc-container">
            <p className="modal-desc">{task.description || "No description provided."}</p>
          </div>

          <div className="modal-grid">
            {/* Left Column: Form Fields */}
            <div className="modal-section">
              <h3>⏱️ Log WIP Time</h3>
              <form id="wip-time-form" onSubmit={handleLogTime} className="log-time-form">
                <div className="form-group">
                  <label>Date Worked</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Hours Logged</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0.1" 
                    value={hours} 
                    onChange={e => setHours(e.target.value)} 
                    placeholder="Hours (e.g. 2.5)" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Progress Notes</label>
                  <textarea 
                    value={description} 
                    className="modal-textarea"
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="What pipeline items did you finish?" 
                    required 
                  />
                </div>
              </form>
            </div>

            {/* Right Column: Tracking + Actions */}
            <div className="modal-section log-history-section">
              <h3>📋 Summary Tracker</h3>
              
              <div className="metrics-summary-box">
                <span><strong>Logged:</strong> {totalLogged}h</span>
                <span><strong>Allocated Budget:</strong> {estimatedHours}h</span>
              </div>

              <div className="status-toggle-box">
                <label>
                  Work Status: <span className={`status-indicator ${status.toLowerCase()}`}>{status}</span>
                </label>
                <button 
                  type="button"
                  onClick={handleToggleStatus} 
                  className="btn-secondary toggle-status-btn"
                >
                  Mark as {status.toLowerCase() === 'pending' ? 'Completed' : 'Pending'}
                </button>
              </div>

              <button 
                type="submit" 
                form="wip-time-form" 
                className="btn-primary form-submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Time Log"}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Pinned Footer */}
        <div className="modal-actions-footer">
          <button type="button" onClick={onClose} className="btn-secondary close-window-btn">
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}