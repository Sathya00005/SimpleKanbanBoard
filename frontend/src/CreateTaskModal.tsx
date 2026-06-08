import { useState } from 'react';
import './CreateTaskModal.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; testCases: string[] }) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testCases, setTestCases] = useState<string[]>(['']);

  if (!isOpen) return null;

  const handleAddTestCase = () => setTestCases([...testCases, '']);
  
  const handleTestCaseChange = (index: number, value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index] = value;
    setTestCases(newTestCases);
  };
  
  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onSubmit({ 
      name, 
      description, 
      testCases: testCases.filter(tc => tc.trim() !== '') 
    });
    
    // Reset state for next open
    setName('');
    setDescription('');
    setTestCases(['']);
  };

  return (
    <div className="modal-overlay" data-testid="create-task-modal">
      <div className="modal-surface">
        <h2>Create New Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="task-name">Task Name *</label>
            <input id="task-name" type="text" value={name} onChange={e => setName(e.target.value)} required data-testid="input-task-name" />
          </div>
          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea id="task-desc" value={description} onChange={e => setDescription(e.target.value)} data-testid="input-task-desc" />
          </div>
          <div className="form-group">
            <label>Test Cases</label>
            {testCases.map((tc, index) => (
              <div key={index} className="test-case-input-row">
                <input type="text" value={tc} onChange={e => handleTestCaseChange(index, e.target.value)} placeholder={`Test case ${index + 1}`} data-testid={`input-test-case-${index}`} />
                {testCases.length > 1 && (
                  <button type="button" onClick={() => handleRemoveTestCase(index)} className="btn-secondary btn-small" data-testid={`remove-test-case-${index}`}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={handleAddTestCase} data-testid="add-test-case">+ Add Test Case</button>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} data-testid="btn-cancel">Cancel</button>
            <button type="submit" className="btn-primary" data-testid="btn-submit">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}
