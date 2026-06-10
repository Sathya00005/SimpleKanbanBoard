import React, { useState } from "react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: { name: string; description: string; testCases: string[] }) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  // Initialize with 2 default input rows for custom test scenarios
  const [testCases, setTestCases] = useState<string[]>(["", ""]);

  if (!isOpen) return null;

  const handleTestCaseChange = (index: number, value: string) => {
    const updatedTests = [...testCases];
    updatedTests[index] = value;
    setTestCases(updatedTests);
  };

  const addTestCaseRow = () => {
    setTestCases([...testCases, ""]);
  };

  const removeTestCaseRow = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Task name is required, macha!");

    // Filter out any blank test cases before sending to the backend
    const filteredTestCases = testCases.filter((tc) => tc.trim() !== "");

    onSubmit({
      name,
      description,
      testCases: filteredTestCases.length > 0 ? filteredTestCases : ["Unit Integration Test", "Regression Test Run"],
    });

    // Reset local form states
    setName("");
    setDescription("");
    setTestCases(["", ""]);
  };

  return (
    /* ✅ FIXED: Added onPointerDown to prevent dnd-kit grid sensors from locking text fields */
    <div className="modal-overlay" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        onPointerDown={(e) => e.stopPropagation()} 
        style={{ maxWidth: "500px", width: "100%" }}
      >
        <h3>Create New Backlog Task</h3>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              placeholder="e.g., Fix Auth Gateway Bug"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Provide context or instructions for this requirement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "8px", minHeight: "8px", resize: "vertical" }}
            />
          </div>

          {/* 🎯 CUSTOM SPRINT 4 INTEGRATION: Custom Test Scenarios Definition Block */}
          <div className="form-group" style={{ gap: "8px" }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Required Pipeline Test Cases</span>
              <button 
                type="button" 
                onClick={addTestCaseRow} 
                style={{ background: "#2563eb", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
              >
                + Add Test
              </button>
            </label>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
              {testCases.map((tc, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder={`Test Scenario #${idx + 1}`}
                    value={tc}
                    onChange={(e) => handleTestCaseChange(idx, e.target.value)}
                    style={{ flex: 1, padding: "8px" }}
                  />
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCaseRow(idx)}
                      style={{ background: "#ef4444", color: "white", border: "none", padding: "8px", borderRadius: "6px", cursor: "pointer" }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: "12px" }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Initialize Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}