import React, { useState } from 'react';
import axios from 'axios';
import type { Task } from './types';

interface WipTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function WipTaskModal({ task, onClose, onUpdate }: WipTaskModalProps) {
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(task.workStatus || 'Pending');

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = parseFloat(hours);
    
    if (parsedHours < 0) return alert('Hours cannot be negative');
    
    try {
      // ✅ FIX: Mapped payload parameters explicitly to match what the backend addTimeLog controller expects
      await axios.post(`${API_BASE_URL}/api/tasks/${task.id}/time-logs`, {
        taskId: task.id,
        hoursSpent: parsedHours,
        description: description,
        logDate: date
      });
      alert('Time logged successfully!');
      setDate('');
      setHours('');
      setDescription('');
      onUpdate();
    } catch (error) {
      console.error('Failed to log time', error);
      alert('Error saving time log.');
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = status === 'Pending' ? 'Completed' : 'Pending';
    try {
      await axios.patch(`${API_BASE_URL}/api/tasks/${task.id}/status`, { status: newStatus });
      setStatus(newStatus);
      onUpdate(); 
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Error updating status.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{task.name} - Progress Logging</h3>
        
        <form onSubmit={handleLogTime} className="form-group" style={{ gap: '12px', marginTop: '16px' }}>
          <label style={{ fontWeight: 600 }}>Log Work Hours</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            required 
          />
          <input 
            type="number" 
            step="0.1" 
            min="0" 
            value={hours} 
            onChange={e => setHours(e.target.value)} 
            placeholder="Hours spent (e.g. 2.5)" 
            required 
          />
          <textarea 
            value={description} 
            style={{ padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', minHeight: '60px' }}
            onChange={e => setDescription(e.target.value)} 
            placeholder="What did you work on?" 
            required 
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '4px' }}>Save Time Log</button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px dashed #E5E7EB', paddingTop: '16px' }}>
          <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
            Work Status: <span style={{ color: status === 'Completed' ? '#10B981' : '#6B7280' }}>{status}</span>
          </label>
          <button 
            type="button"
            onClick={handleToggleStatus} 
            className="btn-secondary" 
            style={{ width: '100%', marginTop: '8px', padding: '10px' }}
          >
            Mark as {status === 'Pending' ? 'Completed' : 'Pending'}
          </button>
        </div>
        
        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Close Window</button>
        </div>
      </div>
    </div>
  );
}