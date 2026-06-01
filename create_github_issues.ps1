# PowerShell script to create GitHub issues based on the development plan.
# Prerequisites:
# 1. Install GitHub CLI (https://cli.github.com/)
# 2. Authenticate by running: gh auth login
# 3. Ensure you are in a directory initialized as a git repository with a remote pointing to GitHub.

Write-Host "Starting to create GitHub issues..."

$issues = @(
    @{ title="Use Case 1: User Registration (Sign Up)"; body="**Description:** A new user creates an account to access the Kanban board.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 2: User Authentication (Login)"; body="**Description:** An existing user logs into the system to view and manage tasks.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 3: View Board"; body="**Description:** The authenticated user views the main Kanban board with all their tasks organized into columns.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 4: Task Creation"; body="**Description:** The user creates a new task in the Backlog.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 5: Manage Task Order (Reorder within Column)"; body="**Description:** The user manually reorders tasks within a single column to prioritize them.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 6: Task Scheduling (Move Backlog -> Scheduled)"; body="**Description:** The user moves a task from Backlog to Scheduled, triggering a gated modal for planning details.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 7: Start Work (Move Scheduled -> WIP)"; body="**Description:** The user moves a task from Scheduled to Work In Progress to indicate development has started.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 8: Log Work and Complete (WIP)"; body="**Description:** The user logs time spent on a task and marks it as completed when development is done.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 9: Move to Testing (Move WIP -> Testing)"; body="**Description:** The user moves a completed task from WIP to the Testing column.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 10: Execute Tests (Testing)"; body="**Description:** The user executes test cases and logs the results for a task in the Testing column.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 11: Automated Reverse Flow (Test Failure)"; body="**Description:** The system automatically moves a task back to the Backlog if any test cases fail.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 12: Deploy Task (Move Testing -> Deployed)"; body="**Description:** The user moves a successfully tested task to the Deployed column, triggering a gated modal.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 13: View Task Details and History"; body="**Description:** The user views the comprehensive details, history, and time tracking of a specific task.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." },
    @{ title="Use Case 14: Edit Task"; body="**Description:** The user updates basic information of an existing task.`n`nFor full main, alternative, exception, and negative flows, refer to the development_plan.md file." }
)

foreach ($issue in $issues) {
    Write-Host "Creating issue: $($issue.title)"
    gh issue create --title $issue.title --body $issue.body
    Start-Sleep -Seconds 2 # Sleep briefly to avoid API rate limits
}

Write-Host "Finished creating issues!"
