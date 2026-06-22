import { useEffect, useState } from "react";
import "./GitHubLanding.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

function getStoredToken() {
  return window.localStorage.getItem("token");
}

function getStoredUserId() {
  return window.localStorage.getItem("userId");
}

interface GitHubLandingProps {
  onProjectSelected: (project: string) => void;
  setErrorMessage: (message: string) => void;
}

export default function GitHubLanding({ onProjectSelected, setErrorMessage }: GitHubLandingProps) {
  const [repos, setRepos] = useState<Array<{ name: string; fullName: string }>>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);

    const connectGitHub = () => {
    const userId = getStoredUserId();
    if (!userId) {
      setErrorMessage("Please sign in before connecting GitHub.");
      return;
    }

    window.location.href = `${API_BASE_URL}/api/auth/github?userId=${encodeURIComponent(userId)}`;
  };

  const loadRepos = async () => {
    try {
      setErrorMessage("");
      setStatusMessage(null);
      setLoadingRepos(true);

      const token = getStoredToken();
      const response = await fetch(`${API_BASE_URL}/api/github/projects`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || "Unable to load GitHub repositories.");
        setRepos([]);
        return;
      }

      if (!Array.isArray(data.repos) || data.repos.length === 0) {
        setRepos([]);
        setStatusMessage("No project available in your GitHub.");
        return;
      }

      setRepos(data.repos);
      setSelectedRepo(data.repos[0].fullName || "");
    } catch (error) {
      console.error("GitHub repo fetch failed", error);
      setErrorMessage("Unable to connect to GitHub repository service.");
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubError = params.get("githubError");
    const githubConnected = params.get("githubConnected");

    if (githubError) {
      setErrorMessage(githubError);
      params.delete("githubError");
      window.history.replaceState({}, document.title, `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }

    if (githubConnected === "1") {
      setGithubConnected(true);
      loadRepos();
      params.delete("githubConnected");
      window.history.replaceState({}, document.title, `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    }
  }, []);

  const proceedWithRepo = () => {
    if (!selectedRepo) {
      setErrorMessage("Please select a repository first.");
      return;
    }
    onProjectSelected(selectedRepo);
  };

  return (
    <div className="github-landing-panel">
      <div className="github-landing-card">
        <h1>Welcome to Your Project Workspace</h1>
        <p>Connect your GitHub account, choose a project, and ingest open issues into Backlog.</p>

        <div className="github-landing-actions">
          <button className="btn-primary" onClick={connectGitHub} disabled={loadingRepos}>
            Connect Your GitHub Account
          </button>
        </div>

        {githubConnected && repos.length === 0 && !loadingRepos && (
          <div className="github-landing-notice">No repository available in your GitHub.</div>
        )}

        {loadingRepos && <p className="github-landing-note">Loading repositories…</p>}

        {repos.length > 0 && (
          <div className="github-landing-dropdown">
            <label htmlFor="repo-select">Select a repository</label>
            <select
              id="repo-select"
              value={selectedRepo}
              onChange={(event) => setSelectedRepo(event.target.value)}
            >
              {repos.map((repo) => (
                <option key={repo.fullName} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={proceedWithRepo}>
              Continue with Repository
            </button>
          </div>
        )}

        {statusMessage && <div className="github-landing-status">{statusMessage}</div>}
      </div>
    </div>
  );
}
