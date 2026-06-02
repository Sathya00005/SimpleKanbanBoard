$ErrorActionPreference = "Continue"

Write-Host "Creating Labels..."
$labels = @(
    "bug", "enhancement", "rework", "story", "task", "activity",
    "frontend", "backend", "database", "auth", "fullstack", "qa", "core",
    "priority:high", "priority:medium", "priority:low",
    "sprint-1", "sprint-2", "sprint-3", "sprint-4", "sprint-5", "sprint-6"
)

foreach ($label in $labels) {
    gh label create $label --force 2>$null
}

Write-Host "Creating Issues..."

$issues = @(
    # Sprint 1
    @{
        title = "[Sprint 1] Setup Frontend and Backend Project Structure"
        body = "**Use Case:** None (Infrastructure)`n**Complexity:** Low`n**Effort:** 4h"
        labels = "task,core,priority:high,sprint-1"
    },
    @{
        title = "[Sprint 1] Design Database Schema for Users"
        body = "**Use Case:** 1. User Registration / 2. Authentication`n**Complexity:** Low`n**Effort:** 2h"
        labels = "task,database,priority:high,sprint-1"
    },
    @{
        title = "[Sprint 1] Develop User Sign Up API and UI"
        body = "**Use Case:** 1. User Registration (Sign Up)`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,auth,priority:high,sprint-1"
    },
    @{
        title = "[Sprint 1] Develop User Login API and UI"
        body = "**Use Case:** 2. User Authentication (Login)`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,auth,priority:high,sprint-1"
    },
    @{
        title = "[Sprint 1] Implement Auth Middleware and Sessions"
        body = "**Use Case:** 2. User Authentication (Login)`n**Complexity:** Medium`n**Effort:** 4h"
        labels = "task,auth,priority:high,sprint-1"
    },

    # Sprint 2
    @{
        title = "[Sprint 2] Design Database Schema for Tasks"
        body = "**Use Case:** 4. Task Creation`n**Complexity:** Low`n**Effort:** 2h"
        labels = "task,database,priority:high,sprint-2"
    },
    @{
        title = "[Sprint 2] Build Main Board UI with Static Columns"
        body = "**Use Case:** 3. View Board`n**Complexity:** Medium`n**Effort:** 6h"
        labels = "story,frontend,priority:high,sprint-2"
    },
    @{
        title = "[Sprint 2] Develop Create Task UI Form"
        body = "**Use Case:** 4. Task Creation`n**Complexity:** Low`n**Effort:** 4h"
        labels = "story,frontend,priority:high,sprint-2"
    },
    @{
        title = "[Sprint 2] Implement Create Task Backend API"
        body = "**Use Case:** 4. Task Creation`n**Complexity:** Low`n**Effort:** 4h"
        labels = "story,backend,priority:high,sprint-2"
    },
    @{
        title = "[Sprint 2] Fetch and Render Tasks on Board"
        body = "**Use Case:** 3. View Board`n**Complexity:** Medium`n**Effort:** 6h"
        labels = "story,fullstack,priority:high,sprint-2"
    },

    # Sprint 3
    @{
        title = "[Sprint 3] Integrate Drag-and-Drop Library for Board"
        body = "**Use Case:** 5. Manage Task Order`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,frontend,priority:high,sprint-3"
    },
    @{
        title = "[Sprint 3] Develop Schedule Task Modal and Transition"
        body = "**Use Case:** 6. Task Scheduling`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,fullstack,priority:high,sprint-3"
    },
    @{
        title = "[Sprint 3] Implement Scheduled to WIP Transition"
        body = "**Use Case:** 7. Start Work`n**Complexity:** Low`n**Effort:** 3h"
        labels = "story,fullstack,priority:medium,sprint-3"
    },
    @{
        title = "[Sprint 3] Develop Deployment Details Modal and Transition"
        body = "**Use Case:** 12. Deploy Task`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,fullstack,priority:high,sprint-3"
    },
    @{
        title = "[Sprint 3] Implement WIP to Testing Transition Logic"
        body = "**Use Case:** 9. Move to Testing`n**Complexity:** Medium`n**Effort:** 5h"
        labels = "story,fullstack,priority:high,sprint-3"
    },

    # Sprint 4
    @{
        title = "[Sprint 4] Implement WIP Time Logging and Status Toggle"
        body = "**Use Case:** 8. Log Work and Complete`n**Complexity:** High`n**Effort:** 12h"
        labels = "story,fullstack,priority:high,sprint-4"
    },
    @{
        title = "[Sprint 4] Implement Testing Features and Results Logging"
        body = "**Use Case:** 10. Execute Tests`n**Complexity:** High`n**Effort:** 12h"
        labels = "story,fullstack,priority:high,sprint-4"
    },
    @{
        title = "[Sprint 4] Implement Manual Reordering within Columns"
        body = "**Use Case:** 5. Manage Task Order`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,fullstack,priority:medium,sprint-4"
    },

    # Sprint 5
    @{
        title = "[Sprint 5] Implement Automated Reverse Flow on Test Failure"
        body = "**Use Case:** 11. Automated Reverse Flow`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,backend,priority:high,sprint-5"
    },
    @{
        title = "[Sprint 5] Develop Detailed Task View and History Timeline"
        body = "**Use Case:** 13. View Task Details and History`n**Complexity:** High`n**Effort:** 10h"
        labels = "story,frontend,priority:medium,sprint-5"
    },
    @{
        title = "[Sprint 5] Implement Baseline Time Tracking Calculations"
        body = "**Use Case:** 13. View Task Details and History`n**Complexity:** Medium`n**Effort:** 6h"
        labels = "task,backend,priority:medium,sprint-5"
    },

    # Sprint 6
    @{
        title = "[Sprint 6] Implement Edit Task Functionality"
        body = "**Use Case:** 14. Edit Task`n**Complexity:** Medium`n**Effort:** 8h"
        labels = "story,fullstack,priority:medium,sprint-6"
    },
    @{
        title = "[Sprint 6] Implement Default Priority Sorting in Backlog"
        body = "**Use Case:** 3. View Board`n**Complexity:** Low`n**Effort:** 3h"
        labels = "enhancement,backend,priority:low,sprint-6"
    },
    @{
        title = "[Sprint 6] Conduct End-to-End Testing and Edge Cases"
        body = "**Use Case:** All Use Cases`n**Complexity:** High`n**Effort:** 16h"
        labels = "activity,qa,priority:high,sprint-6"
    },
    @{
        title = "[Sprint 6] Perform Code Cleanup, Refactoring, and Docs"
        body = "**Use Case:** Project Maintenance`n**Complexity:** Low`n**Effort:** 8h"
        labels = "activity,core,priority:low,sprint-6"
    }
)

foreach ($issue in $issues) {
    Write-Host "Creating issue: $($issue.title)"
    gh issue create --title $issue.title --body $issue.body --label $issue.labels
    Start-Sleep -Seconds 2
}

Write-Host "Done creating issues."