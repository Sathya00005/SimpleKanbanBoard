import { useEffect, useState, useMemo } from "react";
import GitHubLanding from "./GitHubLanding";
import WipTaskModal from "./WipTaskModal"; 
import TestingTaskModal from "./TestingTaskModal";
import CreateTaskModal from "./CreateTaskModal";
import TaskDetailsModal from "./TaskDetailsModal";
import TaskCard from "./TaskCard";
import type { Priority } from "./types";
import "./Board.css";
import { DndContext, useDroppable, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "./types";
import ProjectSelector from './ProjectSelector';

interface BoardProps {
  setIsLoggedIn: (value: boolean) => void;
}

interface DroppableColumnProps {
  title: string;
  tasks: Task[];
  onToggleWorkStatus: (taskId: string, current?: string) => void;
  onMoveToTesting: (taskId: string) => void;
  onSelectTaskForLog: (task: Task) => void;
  onSelectTaskForTesting: (task: Task) => void;
  onSelectTaskForDetails: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onCloseTask: (task: Task) => void;
}

interface DraggableCardProps {
  task: Task;
  onToggleWorkStatus: (taskId: string, current?: string) => void;
  onMoveToTesting: (taskId: string) => void;
  onSelectTaskForLog: (task: Task) => void;
  onSelectTaskForTesting: (task: Task) => void;
  onSelectTaskForDetails: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onCloseTask: (task: Task) => void;
}

const COLUMNS = ["Backlog", "Scheduled", "Work In Progress", "Testing", "Deployed"];
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const normalizeStatus = (value?: string) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
;

const isCompletedStatus = (value?: string) => normalizeStatus(value) === 'completed';
const isWorkInProgressStatus = (value?: string) => normalizeStatus(value) === 'work-in-progress';
const canonicalColumnValue = (value?: string) => {
  const normalized = normalizeStatus(value);
  return COLUMNS.find(column => normalizeStatus(column) === normalized) ?? value ?? '';
};

const getDeploymentValidationItems = (task: Task) => [
  ...(task.acceptanceCriteria ?? []),
  ...(task.testCases ?? []),
  ...(task.positiveTestCases ?? []),
  ...(task.negativeTestCases ?? []),
  ...(task.edgeCases ?? []),
  ...(task.definitionOfDone ?? []),
];

const canMoveTaskToDeployment = (task: Task) => {
  const validationItems = getDeploymentValidationItems(task);
  return validationItems.length > 0 && validationItems.every((item) => item.status === "passed");
};

export default function Board({ setIsLoggedIn }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(() => localStorage.getItem("selectedProject"));
  const [githubError, setGithubError] = useState<string>("");
  const [workspaceMessage, setWorkspaceMessage] = useState<string>("");

  const [detailedTask, setDetailedTask] = useState<Task | null>(null);
  const [wipLogTask, setWipLogTask] = useState<Task | null>(null);
  const [testingGateTask, setTestingGateTask] = useState<Task | null>(null);

  const [schedulingTask, setSchedulingTask] = useState<Task | null>(null);
  const [scheduleFormData, setScheduleFormData] = useState({ startDate: "", endDate: "", effortRequired: "" });

  const [deployingTask, setDeployingTask] = useState<Task | null>(null);
  const [deployFormData, setDeployFormData] = useState({ deployedTime: "", deploymentType: "feature_update" });
  
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", description: "", testCasesString: "" });

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("failed-first");
  const [showClosed, setShowClosed] = useState(false);
  const [taskToClose, setTaskToClose] = useState<Task | null>(null);

  const [previousStatusCache, setPreviousStatusCache] = useState<string | null>(null);

  // Repository Isolation Layer States
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; name: string } | null>(null);
  const [workspaceInitialized, setWorkspaceInitialized] = useState<boolean>(false);


  const displayTasks = useMemo(() => {
    const priorityOrder: Record<Priority, number> = { "Critical": 1, "High": 2, "Medium": 3, "Low": 4 };

    let filteredTasks = tasks.filter(task => {
      const isClosedMatch = showClosed ? task.isClosed : !task.isClosed;
      if (!isClosedMatch) return false;

      if (!searchTerm) return true;
      const lowerSearchTerm = searchTerm.toLowerCase();
      const issueNumberMatch = lowerSearchTerm.match(/^#(\d+)$/);

      if (issueNumberMatch) {
        return task.name.includes(lowerSearchTerm) || (task.githubIssueId && task.githubIssueId.endsWith(issueNumberMatch[1]));
      }

      return (
        task.name.toLowerCase().includes(lowerSearchTerm) ||
        (task.description && task.description.toLowerCase().includes(lowerSearchTerm)) ||
        (task.githubRepo && task.githubRepo.toLowerCase().includes(lowerSearchTerm)) ||
        (Array.isArray(task.labels) &&
          task.labels.some((label) => {
            const name = (label?.name || "").toLowerCase();
            const description = (label?.description || "").toLowerCase();
            return name.includes(lowerSearchTerm) || description.includes(lowerSearchTerm);
          }))
      );
    });

    filteredTasks.sort((a, b) => {
      switch (sortOrder) {
        case "failed-first": {
  const aFailed =
    a.history?.some(h => h.eventType === "TEST_FAILED") ?? false;

  const bFailed =
    b.history?.some(h => h.eventType === "TEST_FAILED") ?? false;

  if (aFailed && !bFailed) return -1;
  if (!aFailed && bFailed) return 1;

  const aPriority =
    priorityOrder[a.priority || "Medium"] || 99;

  const bPriority =
    priorityOrder[b.priority || "Medium"] || 99;

  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }

  return (
    new Date(b.createdAt).getTime() -
    new Date(a.createdAt).getTime()
  );
}
        case "priority":
          const aPriority = priorityOrder[a.priority || "Medium"] || 99;
          const bPriority = priorityOrder[b.priority || "Medium"] || 99;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "recently-updated":
  return (
    new Date(b.updatedAt ?? b.createdAt).getTime() -
    new Date(a.updatedAt ?? a.createdAt).getTime()
  );
        case "recently-created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "alphabetical-az":
          return a.name.localeCompare(b.name);
        case "alphabetical-za":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filteredTasks;
  }, [tasks, searchTerm, sortOrder, showClosed]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 80, tolerance: 5 } })
  );

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  const fetchTasks = async () => {
    try {
      if (!userId) return;
      
      let url = `${API_BASE_URL}/api/tasks/${userId}`;
      if (selectedProject) {
        url += `?githubRepo=${encodeURIComponent(selectedProject)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const freshTasks = await res.json();
      setTasks(freshTasks);

      if (detailedTask) {
        const syncDetail = freshTasks.find((t: Task) => t.id === detailedTask.id);
        if (syncDetail) setDetailedTask(syncDetail);
      }
      if (wipLogTask) {
        const syncWip = freshTasks.find((t: Task) => t.id === wipLogTask.id);
        setWipLogTask(syncWip || null);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    if (!selectedProject) return;
    fetchTasks();
  }, [selectedProject]);

  const handleProjectSelected = (project: string) => {
    localStorage.setItem("selectedProject", project);
    setSelectedProject(project);
    setWorkspaceMessage(`Workspace initialized for ${project}`);
    setGithubError("");
    
    if (project && project.includes("/")) {
      const [owner, name] = project.split("/");
      setSelectedRepo({ owner, name });
    }
  };

  const createTask = async (taskData: { name: string; description: string }) => {
    try {
      if (!userId) return alert("Please login again");
      
      const payload: any = { ...taskData, userId };
      if (selectedRepo) {
        payload.githubRepo = `${selectedRepo.owner}/${selectedRepo.name}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setIsModalOpen(false);
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingTask) return;
  

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${schedulingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Scheduled",
          startDate: scheduleFormData.startDate,
          endDate: scheduleFormData.endDate,
          effortRequired: Number(scheduleFormData.effortRequired)
        }),
      });
      if (!res.ok) throw new Error("Scheduling failed");
      setSchedulingTask(null);
      setPreviousStatusCache(null);
      setScheduleFormData({ startDate: "", endDate: "", effortRequired: "" });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleScheduleCancel = () => {
    if (schedulingTask && previousStatusCache) {
      setTasks(prev => prev.map(t => t.id === schedulingTask.id ? { ...t, status: previousStatusCache } : t));
    }
    setSchedulingTask(null);
    setPreviousStatusCache(null);
  };

  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployingTask) return;

    if (!canMoveTaskToDeployment(deployingTask)) {
      alert("All testing results must be selected and marked Passed before moving this task to Deployment.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${deployingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Deployed",
          deployedTime: deployFormData.deployedTime,
          deploymentType: deployFormData.deploymentType
        }),
      });
      if (!res.ok) throw new Error("Deployment failed");

      setDeployingTask(null);
      setPreviousStatusCache(null);
      setDeployFormData({ deployedTime: "", deploymentType: "feature_update" });
      fetchTasks();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeployCancel = () => {
    if (deployingTask && previousStatusCache) {
      setTasks(prev => prev.map(t => t.id === deployingTask.id ? { ...t, status: previousStatusCache } : t));
    }
    setDeployingTask(null);
    setPreviousStatusCache(null);
  };

  const openEditTask = (task: Task) => {
    setEditTask(task);
    setEditFormData({
      name: task.name,
      description: task.description || "",
      testCasesString: task.testCases ? task.testCases.join(", ") : ""
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;

    try {
      const testCasesArray = editFormData.testCasesString
        .split(",")
        .map(tc => tc.trim())
        .filter(tc => tc.length > 0);

      const payload: any = {
        name: editFormData.name,
        description: editFormData.description,
        testCases: testCasesArray 
      };

      const res = await fetch(`${API_BASE_URL}/api/tasks/${editTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to edit task");

      setEditTask(null);
      fetchTasks();
    } catch (error) {
      console.error(error);
      alert("Unable to save task edits.");
    }
  };

  const handleConfirmClose = async () => {
    if (!taskToClose) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskToClose.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isClosed: true }),
      });
      if (!res.ok) throw new Error("Failed to close task");
      setTaskToClose(null);
      fetchTasks();
    } catch (error) {
      console.error("Error closing task:", error);
      alert("Failed to close task.");
    }
  };


  const logout = () => {
    localStorage.clear();
    setSelectedProject(null);
    setSelectedRepo(null);
    setWorkspaceInitialized(false);
    setIsLoggedIn(false);
  };

  const toggleWorkStatus = async (taskId: string, current?: string) => {
    const newStatus = isCompletedStatus(current) ? "Pending" : "Completed";
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workStatus: newStatus }),
      });
      
      if (res.ok) {
        fetchTasks();
      }
    } catch {
      await fetchTasks();
    }
  };

  const moveToTesting = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !isCompletedStatus(task.workStatus)) {
      return alert("Task must be marked Completed before moving to Testing.");
    }

    // Persist status transition before opening testing modal to avoid snap-back after refresh.
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "Testing" } : t));

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Testing" }),
      });

      if (!res.ok) {
        throw new Error("Failed to move task to Testing");
      }

      await fetchTasks();
      setTestingGateTask({ ...task, status: "Testing", testCases: task.testCases ?? [] });
    } catch (error) {
      console.error(error);
      await fetchTasks();
      alert("Unable to move task to Testing. Please try again.");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => String(t.id) === taskId);
    if (!task) return;

    const overId = String(over.id);
    
    let destinationStatus: string | undefined = undefined;
    const normalizedOverId = normalizeStatus(overId);
    const normalizedCol = COLUMNS.find(col => normalizeStatus(col) === normalizedOverId);
    if (normalizedCol) {
      destinationStatus = normalizedCol;
    } else {
      const overTask = tasks.find((t) => String(t.id) === overId);
      destinationStatus = canonicalColumnValue(overTask?.status);
    }

    if (!destinationStatus || !COLUMNS.includes(destinationStatus)) return;

    const currentStatus = canonicalColumnValue(task.status || "Backlog");
    const currentIdx = COLUMNS.indexOf(currentStatus);
    const destinationIdx = COLUMNS.indexOf(destinationStatus);

    if (destinationStatus === currentStatus) return;

    if (destinationIdx < currentIdx) {
      alert("Invalid Action: You cannot manually drag items backward in the workflow sequence.");
      return;
    }

    if (destinationIdx > currentIdx + 1) {
      alert("You can only move cards step-by-step.");
      return;
    }

    setPreviousStatusCache(currentStatus);

    if (destinationStatus === "Scheduled") {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      setScheduleFormData({
        startDate: today.toISOString().split("T")[0],
        endDate: nextWeek.toISOString().split("T")[0],
        effortRequired: ""
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "Scheduled" } : t)));
      setSchedulingTask(task);
      return;
    }

    if (destinationStatus === "Testing") {
      if (!isCompletedStatus(task.workStatus)) {
        alert("Complete work requirements before moving to Testing.");
        fetchTasks();
        return;
      }
      setTestingGateTask({ ...task, testCases: task.testCases ?? [] });
    }

    if (destinationStatus === "Deployed") {
      if (!canMoveTaskToDeployment(task)) {
        alert("All testing results must be selected and marked Passed before moving this task to Deployment.");
        await fetchTasks();
        return;
      }

      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: "Deployed" } : t)));
      setDeployingTask(task);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destinationStatus }),
      });
      if (res.ok) fetchTasks();
    } catch (error) {
      console.error(error);
      fetchTasks();
    }
  };

  const boardStats = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.isClosed);
    return {
      total: tasks.length,
      active: activeTasks.length,
      closed: tasks.length - activeTasks.length,
      failed: activeTasks.filter(t => t.history?.some(h => h.eventType === "TEST_FAILED")).length,
      testing: activeTasks.filter(t => t.status === "Testing").length,
      deployed: activeTasks.filter(t => t.status === "Deployed").length,
      critical: activeTasks.filter(t => t.priority === "Critical").length,
      high: activeTasks.filter(t => t.priority === "High").length,
      medium: activeTasks.filter(t => t.priority === "Medium").length,
      low: activeTasks.filter(t => t.priority === "Low").length,
    };
  }, [tasks]);
  // ==========================================
  // VIEW ENGINE RENDERING LAYERS
  // ==========================================

  // STEP 1: Repository hasn't been highlighted yet
  if (!selectedRepo) {
    return (
      <div className="board-container">
        <GitHubLanding onProjectSelected={handleProjectSelected} setErrorMessage={setGithubError} />
        {githubError ? <div className="github-error-banner">{githubError}</div> : null}
        {workspaceMessage ? <div className="github-status-banner">{workspaceMessage}</div> : null}
      </div>
    );
  }

  // STEP 2: Repo verified, evaluating project listings with proper callback mappings
  if (selectedRepo && !workspaceInitialized) {
    return (
      <div className="board-container">
        <header className="board-header">
          <div>
            <h2>Project Workspace Setup</h2>
            <p>Repository: {selectedRepo.owner} / {selectedRepo.name}</p>
          </div>
          <div className="board-controls">
            <button className="btn-secondary" onClick={() => setSelectedRepo(null)}>← Back to Repos</button>
            <button className="btn-secondary" onClick={logout}>Logout</button>
          </div>
        </header>
        <ProjectSelector 
          owner={selectedRepo.owner}
          repoName={selectedRepo.name}
          onFlowComplete={async () => {
            try {
              await fetchTasks();
              setWorkspaceInitialized(true);
            } catch (error) {
              console.error(error);
            }
          }}
        />
      </div>
    );
  }

  // STEP 3: Load RepoWorkspace by structuring props to wrap into RepoWorkspaceProps 'data' signature
  
  const currentWorkspacePath = `${selectedRepo.owner}/${selectedRepo.name}`;
  const workspaceTasks = displayTasks.filter(t => t.githubRepo === currentWorkspacePath);

  return (
    <div className="board-container">
      <header className="board-header">
        <div>
          <h2>Integrated Kanban Board</h2>
          <p>
            {username} | {selectedRepo.name} | 
            Active: <strong>{boardStats.active}</strong> • 
            Failed: <strong style={{color: 'red'}}>{boardStats.failed}</strong> • 
            Testing: <strong>{boardStats.testing}</strong>
          </p>
        </div>
        <div className="board-controls">
          <input
            type="text"
            placeholder="Search tasks..."
            className="toolbar-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="toolbar-dropdown" 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: '12px 16px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-white)', fontSize: '14px' }}
          >
            <option value="failed-first">Failed First</option>
            <option value="priority">Priority</option>
            <option value="recently-updated">Updated</option>
            <option value="recently-created">Created</option>
          </select>
          <label className="toolbar-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Closed
          </label>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Task</button>
          <button className="btn-secondary" onClick={() => setWorkspaceInitialized(false)}>Back</button>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <div style={{ display: "block" }}>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="kanban-grid">
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col}
                title={col}
                tasks={workspaceTasks.filter(t => isWorkInProgressStatus(col) ? isWorkInProgressStatus(t.status) : normalizeStatus(t.status || 'Backlog') === normalizeStatus(col))}
                onToggleWorkStatus={toggleWorkStatus}
                onMoveToTesting={moveToTesting}
                onSelectTaskForLog={setWipLogTask} 
                onSelectTaskForTesting={setTestingGateTask}
                onSelectTaskForDetails={setDetailedTask}
                onEditTask={openEditTask}
                onCloseTask={setTaskToClose}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={createTask} />

      {detailedTask && (
        <TaskDetailsModal task={detailedTask} onClose={() => setDetailedTask(null)} />
      )}

      {/* Fixed code in Board.tsx */}

{wipLogTask && (
  <WipTaskModal
    task={wipLogTask}
    onClose={() => setWipLogTask(null)}
    onUpdate={fetchTasks} 
    onToggleWorkStatus={toggleWorkStatus}
  />
)}

      {testingGateTask && (
        <TestingTaskModal 
          task={testingGateTask}
          onClose={() => { fetchTasks(); setTestingGateTask(null); }}
          onUpdate={() => { fetchTasks(); setTestingGateTask(null); }}
        />
      )}

      {editTask && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
            <h3>Edit Task: {editTask.name}</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Task Name</label>
                <input type="text" required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Test Cases (Separate with commas)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Unit Integration Test, Regression Test"
                  value={editFormData.testCasesString} 
                  onChange={(e) => setEditFormData({ ...editFormData, testCasesString: e.target.value })} 
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditTask(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {schedulingTask && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
            <h3>Schedule Task: {schedulingTask.name}</h3>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" required value={scheduleFormData.startDate} onChange={e => setScheduleFormData({...scheduleFormData, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" required value={scheduleFormData.endDate} onChange={e => setScheduleFormData({...scheduleFormData, endDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Effort Needed (Hours)</label>
                <input type="number" required value={scheduleFormData.effortRequired} onChange={e => setScheduleFormData({...scheduleFormData, effortRequired: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleScheduleCancel}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deployingTask && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
            <h3>Deploy Task: {deployingTask.name}</h3>
            <form onSubmit={handleDeploySubmit}>
              <div className="form-group">
                <label>Release Timestamp</label>
                <input type="datetime-local" required value={deployFormData.deployedTime} onChange={e => setDeployFormData({...deployFormData, deployedTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Deployment Classification</label>
                <select value={deployFormData.deploymentType} onChange={e => setDeployFormData({...deployFormData, deploymentType: e.target.value})}>
                  <option value="feature_update">Feature Release</option>
                  <option value="bug_fix">Bug Fix</option>
                  <option value="hotfix">Urgent Hotfix</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleDeployCancel}>Cancel</button>
                <button type="submit" className="btn-primary">Complete Deployment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskToClose && (
        <div className="modal-overlay" onPointerDown={e => e.stopPropagation()}>
          <div className="modal-content">
            <h3>Close Task?</h3>
            <p>Are you sure you want to close "{taskToClose.name}"? This will remove it from the active workflow.</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setTaskToClose(null)}>Cancel</button>
              <button type="button" className="btn-danger" onClick={handleConfirmClose}>Close Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn(props: DroppableColumnProps) {
  const { title, tasks, ...handlers } = props;
  const { setNodeRef, isOver } = useDroppable({ id: title });
  const columnItems = tasks.map((t: Task) => String(t.id));

  return (
    <div ref={setNodeRef} className="kanban-column" style={{ borderColor: isOver ? "#2563eb" : "transparent" }}>
      <h3>{title}</h3>
      <SortableContext items={columnItems} strategy={verticalListSortingStrategy}>
        <div className="column-cards-container" style={{ minHeight: "200px", width: "100%" }}>
          {tasks.map((t: Task) => (
            <DraggableCard 
              key={t.id} 
              task={t} 
              {...handlers}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableCard({ task, onToggleWorkStatus, onMoveToTesting, onSelectTaskForLog, onSelectTaskForTesting, onSelectTaskForDetails, onEditTask, onCloseTask }: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(task.id) });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, 
  };

  const actualTimeHours = task.timeLogs?.reduce((sum: number, log: any) => sum + Number(log.hoursSpent || 0), 0) || 0;

  return (
    <div ref={setNodeRef} style={style} className="kanban-card-wrapper">
      <div className="card-drag-handle-wrapper" {...listeners} {...attributes}>
        <TaskCard task={task} onClose={() => onCloseTask(task)} />
      </div>

      <div className="card-interactive-actions-overlay" onPointerDown={e => e.stopPropagation()}>
        <div style={{ padding: "0 12px 12px 12px", marginTop: "-4px" }}>
          {actualTimeHours > 0 && (
            <div style={{ fontSize: "11px", color: "#4b5563", marginBottom: "6px", backgroundColor: "#f3f4f6", padding: "2px 6px", borderRadius: "4px", display: "inline-block" }}>
              ⏱️ Logged: {actualTimeHours.toFixed(1)} hrs
            </div>
          )}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => onSelectTaskForDetails(task)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", cursor: "pointer", padding: "4px 0", fontWeight: 500 }}>
              🔎 View Details & History
            </button>
            <button type="button" onClick={() => onEditTask(task)} style={{ background: "none", border: "none", color: "#10b981", fontSize: "12px", cursor: "pointer", padding: "4px 0", fontWeight: 500 }}>
              ✏️ Edit Task
            </button>
              {isWorkInProgressStatus(task.status) && (
              <button type="button" onClick={() => onSelectTaskForLog(task)} style={{ background: "none", border: "none", color: "#ea580c", fontSize: "12px", cursor: "pointer", padding: "4px 0", fontWeight: 600 }}>
                ⏱️ Log WIP Effort
              </button>
            )}
          </div>
        </div>
        

        {isWorkInProgressStatus(task.status) && (
          <div className="card-controls" style={{ padding: "0 12px 12px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
            <label style={{ fontSize: "12px" }}>
              <input type="checkbox" checked={task.workStatus === "Completed"} onChange={() => onToggleWorkStatus(task.id, task.workStatus)} />
              Completed
            </label>
            <button disabled={!isCompletedStatus(task.workStatus)} onClick={() => isCompletedStatus(task.workStatus) && onMoveToTesting(task.id)} style={{ fontSize: "11px", padding: "4px 8px" }}>
              Send to Testing
            </button>
          </div>
        )}
        

        {task.status === "Testing" && (
          <div className="card-controls" style={{ padding: "0 12px 12px 12px" }}>
            <button className="btn-primary" onClick={() => onSelectTaskForTesting(task)} style={{ fontSize: "11px", padding: "4px 8px", width: "100%" }}>
              Log Test Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}