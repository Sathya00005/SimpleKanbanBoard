import { useState } from "react";
import "./TaskDetailsModal.css";
import type { Task, ValidationItem } from "./types";

interface TaskDetailsModalProps {
  task: Task;
  onClose: () => void;
}

export default function TaskDetailsModal({
  task,
  onClose,
}: TaskDetailsModalProps) {
  const [expandedFailedId, setExpandedFailedId] = useState<string | null>(null);
  
  // Localized search states for each possible Validation list
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({
    "Acceptance Criteria": "",
    "Test Cases": "",
    "Positive Test Cases": "",
    "Negative Test Cases": "",
    "Edge Cases": "",
  });

  const actualTimeHours =
    task.timeLogs?.reduce(
      (sum, log) => sum + Number(log.hoursSpent || 0),
      0
    ) || 0;

  const scheduleInfo =
    task.startDate ||
    task.endDate ||
    task.effortRequired !== undefined;

  const handleSearchChange = (title: string, value: string) => {
    setSearchFilters((prev) => ({ ...prev, [title]: value }));
  };

  const renderSectionColumn = (title: string, items?: ValidationItem[]) => {
    if (!items || items.length === 0) return null;

    const searchTerm = searchFilters[title] || "";
    const cleanSearchTerm = searchTerm.toLowerCase().trim();
    
    // Calculate dynamic statistics for this section column
    const stats = items.reduce(
      (acc, item) => {
        if (item.status === "passed") acc.passed++;
        else if (item.status === "failed") acc.failed++;
        else acc.pending++;
        return acc;
      },
      { passed: 0, failed: 0, pending: 0 }
    );

    // Filter items based on item text OR matched label strings
    const filteredItems = items.filter((item) => {
      const matchesText = item.text?.toLowerCase().includes(cleanSearchTerm);

      // Scans label entries safely and tolerates malformed API data.
      const matchesLabel = Array.isArray(item.labels)
        ? item.labels.some((label) =>
            String(label).toLowerCase().includes(cleanSearchTerm)
          )
        : false;

      return matchesText || matchesLabel;
    });

    return (
      <div className="validation-column">
        <div className="task-section-header">
          <h4 className="task-section-title">{title}</h4>
          <div className="section-mini-stats">
            <span className="mini-badge active" title="Pending">P: {stats.pending}</span>
            <span className="mini-badge passed" title="Passed">✓: {stats.passed}</span>
            <span className="mini-badge failed" title="Failed">✕: {stats.failed}</span>
          </div>
        </div>

        <div className="section-search-wrapper">
          <input
            type="text"
            placeholder={`Filter by content or label...`}
            className="section-search-input"
            value={searchTerm}
            onChange={(e) => handleSearchChange(title, e.target.value)}
          />
        </div>

        <div className="validation-scroll-container">
          <div className="validation-list">
            {filteredItems.map((item, index) => (
              <div key={item.id || index} className={`validation-item-card ${item.status}`}>
                <div
                  className="validation-item-header"
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px', 
                    cursor: item.status === "failed" ? "pointer" : "default" 
                  }}
                  onClick={() => {
                    if (item.status === "failed") {
                      setExpandedFailedId(expandedFailedId === item.id ? null : item.id);
                    }
                  }}
                >
                  <span className="validation-item-text">
                    {item.status === "passed" && "✓ "}
                    {item.status === "failed" && "✖ "}
                    {item.status === "pending" && "○ "}
                    {item.text}
                  </span>

                  {/* 🏷️ DYNAMIC VISUAL CHIPS DISPLAY FOR GITHUB LABELS */}
                  {item.labels && item.labels.length > 0 && (
                    <div className="validation-item-labels" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                      {item.labels.map((label, lIdx) => (
                        <span 
                          key={lIdx} 
                          className="item-label-chip"
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            background: "rgba(88, 166, 255, 0.12)",
                            color: "#58a6ff",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid rgba(88, 166, 255, 0.2)"
                          }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {item.status === "failed" && expandedFailedId === item.id && (
                  <div className="validation-item-failure">
                    <p><strong>Failed By:</strong> {item.failedBy || "Tester"}</p>
                    <p><strong>Failed At:</strong> {item.failedAt ? new Date(item.failedAt).toLocaleString() : "Unknown"}</p>
                    <p><strong>Reason:</strong> {item.failureReason || "No reason provided"}</p>
                    {item.testerNotes && <p><strong>Tester Notes:</strong> {item.testerNotes}</p>}
                  </div>
                )}
              </div>
            ))}
            {filteredItems.length === 0 && (
              <p className="task-empty-inline">No matching items found.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-content board-layout-view" onClick={(e) => e.stopPropagation()}>
        
        <div className="task-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="task-modal-title">{task.name}</h2>
          <button
            type="button"
            className="task-modal-icon-close"
            onClick={onClose}
            aria-label="Close task details"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#8b949e' }}
          >
            ✕
          </button>
        </div>

        <div className="board-main-container">
          
          {/* LEFT SIDEBAR */}
          <aside className="board-side-panel">
            <div className="task-section">
              <h4 className="task-section-title" style={{ marginBottom: '8px' }}>Overview</h4>
              <p className="task-info">
                <strong>Description:</strong> {task.description || "No description provided."}
              </p>
              <p className="task-info">
                <strong>Status:</strong> <span className="status-pill">{task.status}</span>
              </p>
              {task.workStatus && (
                <p className="task-info">
                  <strong>Work Status:</strong> {task.workStatus}
                </p>
              )}
              {scheduleInfo && (
                <p className="task-info">
                  <strong>Schedule:</strong>{" "}
                  {task.startDate ? new Date(task.startDate).toLocaleDateString() : "—"}
                  {" to "}
                  {task.endDate ? new Date(task.endDate).toLocaleDateString() : "—"}
                  {task.effortRequired !== undefined && ` · Effort: ${task.effortRequired} hrs`}
                </p>
              )}
              <p className="task-info">
                <strong>Total Effort Logged:</strong> {actualTimeHours.toFixed(1)} hours
              </p>
            </div>

            {/* Technical Notes */}
            {task.technicalNotes && task.technicalNotes.length > 0 && (
              <div className="task-section">
                <h4 className="task-section-title" style={{ marginBottom: '8px' }}>Technical Notes</h4>
                <div className="task-box task-scroll-box">
                  <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: '#c9d1d9' }}>
                    {task.technicalNotes.map((note, idx) => (
                      <li key={note.id || idx} className="task-history-item" style={{ borderBottom: 'none', padding: '4px 0' }}>
                        {note.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Definition of Done */}
            {task.definitionOfDone && task.definitionOfDone.length > 0 && (
              <div className="task-section">
                <h4 className="task-section-title" style={{ marginBottom: '8px' }}>Definition Of Done</h4>
                <div className="task-box task-scroll-box">
                  <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: '#c9d1d9' }}>
                    {task.definitionOfDone.map((item, idx) => (
                      <li key={item.id || idx} className="task-history-item" style={{ borderBottom: 'none', padding: '4px 0' }}>
                        <span style={{ color: item.status === "passed" ? "#238636" : "#8b949e", marginRight: '6px' }}>
                          {item.status === "passed" ? "✓" : "○"}
                        </span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {task.dependencies && task.dependencies.length > 0 && (
              <div className="task-section">
                <h4 className="task-section-title" style={{ marginBottom: '8px' }}>Dependencies</h4>
                <div className="task-box task-scroll-box">
                  <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '13px', color: '#c9d1d9' }}>
                    {task.dependencies.map((dep, idx) => (
                      <li key={dep.id || idx} className="task-history-item" style={{ borderBottom: 'none', padding: '4px 0' }}>
                        {dep.text} <span className="status-pill" style={{ fontSize: '10px', padding: '2px 6px' }}>{dep.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT LANES: Render active filter lanes */}
          <main className="board-columns-deck">
            {renderSectionColumn("Acceptance Criteria", task.acceptanceCriteria)}
            {renderSectionColumn("Test Cases", task.testCases)}
            {renderSectionColumn("Positive Test Cases", task.positiveTestCases)}
            {renderSectionColumn("Negative Test Cases", task.negativeTestCases)}
            {renderSectionColumn("Edge Cases", task.edgeCases)}
          </main>

        </div>

        {/* FIXED FOOTER */}
        <footer className="task-footer">
          <button type="button" className="task-close-btn" onClick={onClose}>
            Close
          </button>
        </footer>

      </div>
    </div>
  );
}