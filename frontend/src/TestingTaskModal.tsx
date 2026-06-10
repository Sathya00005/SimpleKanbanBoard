import React, { useState } from 'react';
import type { Task } from './types';

interface TestingTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

interface TestResultState {
  name: string;
  startTime: string;
  endTime: string;
  status: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function TestingTaskModal({
  task,
  onClose,
  onUpdate
}: TestingTaskModalProps) {
  const initialResults: TestResultState[] = (
    task.testCases || ["Unit Integration Test", "Regression Test Run"]
  ).map((tc: string) => ({
    name: tc,
    startTime: '',
    endTime: '',
    status: 'Passed'
  }));

  const [results, setResults] = useState<TestResultState[]>(initialResults);

  const handleChange = (
    index: number,
    field: keyof TestResultState,
    value: string
  ) => {
    const newResults = [...results];
    newResults[index] = { ...newResults[index], [field]: value };
    setResults(newResults);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasFailedTests = results.some(r => r.status === 'Failed');

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/tasks/${task.id}/test-results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results })
        }
      );

      if (!res.ok) throw new Error('Failed to save test results');

      if (hasFailedTests) {
        await fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Backlog' })
        });

        alert(
          "Test failure detected. Task has been automatically moved back to the Backlog."
        );
      } else {
        const data = await res.json();
        alert(
          data.message ||
            "All tests passed! You can now move the task to Deployed."
        );
      }

      onUpdate();
    } catch (error) {
      console.error(error);
      alert('Error saving test results.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <h3>Testing Phase: {task.name}</h3>

        {results.length === 0 ? (
          <p>No test cases defined for this task.</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginTop: '16px'
            }}
          >
            {results.map((res: TestResultState, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB'
                }}
              >
                <strong
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#1F2937'
                  }}
                >
                  Test Group: {res.name}
                </strong>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4B5563'
                      }}
                    >
                      Start Execution
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={res.startTime}
                      onChange={e =>
                        handleChange(idx, 'startTime', e.target.value)
                      }
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4B5563'
                      }}
                    >
                      End Execution
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={res.endTime}
                      onChange={e =>
                        handleChange(idx, 'endTime', e.target.value)
                      }
                      style={{ width: '100%', marginTop: '4px' }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4B5563'
                      }}
                    >
                      Output Verdict
                    </label>
                    <select
                      value={res.status}
                      onChange={e =>
                        handleChange(idx, 'status', e.target.value)
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        marginTop: '4px',
                        borderRadius: '4px',
                        border: '1px solid #D1D5DB'
                      }}
                    >
                      <option value="Passed">Passed ✅</option>
                      <option value="Failed">Failed ❌</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Submit All Results
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}