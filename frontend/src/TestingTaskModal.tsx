import { useState } from "react";
import "./TaskDetailsModal.css";
import type { Task, ValidationItem } from "./types";
import api from "./setupInterceptors";

interface TestingTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

type CategoryType = 'acceptanceCriteria' | 'testCases' | 'edgeCases' | 'positiveTestCases' | 'negativeTestCases' | 'definitionOfDone';

export default function TestingTaskModal({
  task,
  onClose,
  onUpdate
}: TestingTaskModalProps) {
  const [localTask, setLocalTask] = useState<Task>(JSON.parse(JSON.stringify(task)));
  const [submitting, setSubmitting] = useState(false);
  
  // Local state for independent column search terms
  const [searchTerms, setSearchTerms] = useState<Record<CategoryType, string>>({
    acceptanceCriteria: "",
    testCases: "",
    positiveTestCases: "",
    negativeTestCases: "",
    edgeCases: "",
    definitionOfDone: ""
  });

  const updateItem = (category: CategoryType, id: string, changes: Partial<ValidationItem>) => {
    setLocalTask(prev => {
      const arr = prev[category] || [];
      const updated = arr.map(item => item.id === id ? { ...item, ...changes } : item);
      return { ...prev, [category]: updated };
    });
  };

  const handleValidationSelect = (category: CategoryType, id: string, status: "passed" | "failed" | "pending") => {
    updateItem(category, id, { status });
  };

  const handleReasonChange = (category: CategoryType, id: string, reason: string) => {
    updateItem(category, id, { failureReason: reason });
  };

  const handleSearchChange = (category: CategoryType, value: string) => {
    setSearchTerms(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      const allItems = [
        ...(localTask.acceptanceCriteria || []),
        ...(localTask.testCases || []),
        ...(localTask.positiveTestCases || []),
        ...(localTask.negativeTestCases || []),
        ...(localTask.edgeCases || []),
        ...(localTask.definitionOfDone || [])
      ];
      
      const anyFailed = allItems.some(i => i.status === "failed");
      const anyPending = allItems.some(i => i.status === "pending");

      const failedItemsWithoutReason = allItems.filter(i => i.status === "failed" && (!i.failureReason || !i.failureReason.trim()));
      if (failedItemsWithoutReason.length > 0) {
        alert("Please provide a failure reason for all failed tests.");
        setSubmitting(false);
        return;
      }

      if (!anyFailed && anyPending) {
        alert("Please evaluate all tests. Tests must either Pass or Fail before concluding.");
        setSubmitting(false);
        return;
      }

      let finalAC = localTask.acceptanceCriteria || [];
      let finalTC = localTask.testCases || [];
      let finalPTC = localTask.positiveTestCases || [];
      let finalNTC = localTask.negativeTestCases || [];
      let finalEC = localTask.edgeCases || [];
      let finalDoD = localTask.definitionOfDone || [];

      let newStatus = localTask.status;

      if (anyFailed) {
        const resetPassToPending = (items: ValidationItem[]): ValidationItem[] => 
          items.map((item): ValidationItem => item.status === "passed" ? { ...item, status: "pending" } : item);
        
        finalAC = resetPassToPending(finalAC);
        finalTC = resetPassToPending(finalTC);
        finalPTC = resetPassToPending(finalPTC);
        finalNTC = resetPassToPending(finalNTC);
        finalEC = resetPassToPending(finalEC);
        finalDoD = resetPassToPending(finalDoD);
        newStatus = "Backlog";
      }

      await api.put(`/api/tasks/${localTask.id}`, {
        acceptanceCriteria: finalAC,
        testCases: finalTC,
        positiveTestCases: finalPTC,
        negativeTestCases: finalNTC,
        edgeCases: finalEC,
        definitionOfDone: finalDoD,
        status: newStatus,
        workStatus: anyFailed ? "Pending" : "Completed",
        testRunResult: anyFailed ? "FAILED" : "PASSED"
      });

      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to submit test results.");
      setSubmitting(false);
    }
  };

  const renderValidationColumn = (title: string, category: CategoryType, items?: ValidationItem[]) => {
    if (!items || items.length === 0) return null;

    // Filter items based on the search state
    const searchTerm = searchTerms[category].toLowerCase();
    const filteredItems = items.filter(item => item.text.toLowerCase().includes(searchTerm));

    // Stats calculations for badge arrays
    const totalCount = items.length;
    const passedCount = items.filter(i => i.status === "passed").length;
    const failedCount = items.filter(i => i.status === "failed").length;

    return (
      
      <div className="validation-column">
        <div className="task-section-header">
          <h4 className="task-section-title">{title}</h4>
          <div className="section-mini-stats">
            <span className="mini-badge active" title="Total items">{totalCount}</span>
            {passedCount > 0 && <span className="mini-badge passed" title="Passed">{passedCount}✓</span>}
            {failedCount > 0 && <span className="mini-badge failed" title="Failed">{failedCount}✗</span>}
          </div>
        </div>

        <div className="section-search-wrapper">
          <input 
            type="text" 
            className="section-search-input" 
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerms[category]}
            onChange={(e) => handleSearchChange(category, e.target.value)}
          />
        </div>

        <div className="validation-scroll-container">
          <div className="validation-list">
            {filteredItems.length === 0 ? (
              <p className="task-empty-inline">No matching items found</p>
            ) : (
              filteredItems.map(item => (
                <div key={item.id} className={`validation-item-card ${item.status}`}>
                  <div className="validation-item-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span className="validation-item-text">{item.text}</span>
                    
                    <select 
                      value={item.status} 
                      onChange={(e) => handleValidationSelect(category, item.id, e.target.value as any)}
                      style={{ alignSelf: 'flex-start', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {item.status === "failed" && (
                    <div className="validation-item-failure">
                      <p><strong>Reason for failure:</strong></p>
                      <input 
                        type="text" 
                        placeholder="Type failure details..." 
                        value={item.failureReason || ""} 
                        onChange={(e) => handleReasonChange(category, item.id, e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '12px', border: '1px solid #fca5a5', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-content board-layout-view" onClick={(e) => e.stopPropagation()}>
        <h2 className="task-modal-title">Evaluate: {localTask.name}</h2>

        <div className="board-main-container">
          {/* LEFT SIDEBAR: Technical context panel */}
          <aside className="board-side-panel">
            <div className="task-section">
              <h4 className="task-section-title" style={{ marginBottom: '8px' }}>Task Context</h4>
              <p className="task-info"><strong>Status:</strong> <span className="status-pill">{localTask.status}</span></p>
            </div>

            {localTask.technicalNotes && localTask.technicalNotes.length > 0 && (
              <div className="task-section">
                <h4 className="task-section-title" style={{ marginBottom: '8px' }}>Technical Notes</h4>
                <div className="task-box task-scroll-box">
                  <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: '#334155' }}>
                    {localTask.technicalNotes.map((note) => (
                      <li key={note.id || note.text} className="task-history-item" style={{ borderBottom: 'none' }}>
                        {note.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Context Placeholder fallback */}
            <div className="task-section">
              <h4 className="task-section-title">Reference Rules</h4>
              <pre className="code-block-preview">
                {`// Automated Evaluation Rule\nif (anyFailed) {\n  status = "Backlog";\n}`}
              </pre>
            </div>
          </aside>

          {/* RIGHT LANES: The horizontal deck of validation arrays */}
          <main className="board-columns-deck">
            {renderValidationColumn("Acceptance Criteria", "acceptanceCriteria", localTask.acceptanceCriteria)}
            {renderValidationColumn("Test Cases", "testCases", localTask.testCases)}
            {renderValidationColumn("Positive Tests", "positiveTestCases", localTask.positiveTestCases)}
            {renderValidationColumn("Negative Tests", "negativeTestCases", localTask.negativeTestCases)}
            {renderValidationColumn("Edge Cases", "edgeCases", localTask.edgeCases)}
            {renderValidationColumn("Definition Of Done", "definitionOfDone", localTask.definitionOfDone)}
          </main>
        </div>

        {/* BOTTOM FIXED FOOTER */}
        <footer className="task-footer" style={{ gap: '10px' }}>
          <button type="button" className="task-close-btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button 
            type="button" 
            className="task-close-btn" 
            onClick={handleSubmit} 
            disabled={submitting}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
          >
            {submitting ? "Submitting..." : "Submit Evaluation"}
          </button>
        </footer>
      </div>
    </div>
  );
}