import { useState, useEffect } from "react";
import "./ProjectSelector.css";

export interface GitHubProject {
  id: string;
  title: string;
}

interface ProjectSelectorProps {
  owner: string;
  repoName: string;
  onFlowComplete: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function ProjectSelector({
  owner,
  repoName,
  onFlowComplete,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<GitHubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewState, setViewState] = useState<"projects" | "no_projects" | "no_issues">("projects");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const checkRepoState = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/api/github/projects?owner=${owner}&repo_name=${repoName}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          setViewState("projects");
        } else {
          setViewState("no_projects");
        }
      } catch (err: any) {
        setError(err.message || "Unable to load repository data");
      } finally {
        setLoading(false);
      }
    };

    if (owner && repoName) {
      checkRepoState();
    }
  }, [owner, repoName]);

  const handleProjectImport = async (projectId: string) => {
    setImporting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const res = await fetch(`${API_BASE_URL}/api/github/project-issues`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ projectId, userId }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import project issues");
      onFlowComplete();
    } catch (err: any) {
      setError(err.message);
      setImporting(false);
    }
  };

  const handleRepoImport = async () => {
    setImporting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const res = await fetch(`${API_BASE_URL}/api/github/fetch-issues`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ repoPath: `${owner}/${repoName}`, userId }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch repository issues");

      if (data.emptyProject) {
        setViewState("no_issues");
        setImporting(false);
      } else {
        onFlowComplete();
      }
    } catch (err: any) {
      setError(err.message);
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="project-selector-card loading-state">
        <div className="spinner"></div>
        <p>Analyzing repository metadata...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-selector-card error-state">
        <h4>Connection Error</h4>
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="project-selector-card">
      <div className="card-header">
        <h3>Import Workspace</h3>
        <p className="subtitle">{owner} / {repoName}</p>
      </div>

      <hr className="divider" />

      {viewState === "projects" && (
        <div className="card-body">
          <label htmlFor="project-dropdown">GitHub Project Boards v2</label>
          <select
            id="project-dropdown"
            defaultValue=""
            onChange={(e) => handleProjectImport(e.target.value)}
            disabled={importing}
            className="custom-select"
          >
            <option value="" disabled>Choose an active project board...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          
          <div className="fallback-action">
            <p>Don't want to use a board structure?</p>
            <button className="link-button" onClick={handleRepoImport} disabled={importing}>
              Directly import raw repository issues instead
            </button>
          </div>
        </div>
      )}

      {viewState === "no_projects" && (
        <div className="card-body empty-state">
          <div className="info-icon">📋</div>
          <h4>No Project Boards Detected</h4>
          <p>This repository doesn't have any structural GitHub Projects setup. You can still bring all individual tasks onto your kanban board directly.</p>
          <button className="btn-primary" onClick={handleRepoImport} disabled={importing}>
            {importing ? "Importing Tasks..." : "Fetch Repository Issues"}
          </button>
        </div>
      )}

      {viewState === "no_issues" && (
        <div className="card-body empty-state">
          <div className="info-icon">✨</div>
          <h4>Clean Slate!</h4>
          <p>There are currently no open issues or structural boards inside this repository.</p>
          <a 
            href={`https://github.com/${owner}/${repoName}/issues/new`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: "inline-block", textDecoration: "none" }}
          >
            Create Your First Issue
          </a>
        </div>
      )}

      {importing && (
        <div className="overlay-loader">
          <p>Syncing your board data directly from GitHub...</p>
        </div>
      )}
    </div>
  );
}