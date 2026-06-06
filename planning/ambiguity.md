# Architectural Ambiguities & Open Issues

This document tracks logical conflicts, edge cases, and architectural ambiguities discovered during the deep analysis of the Simple Kanban Board planning documents. 

## 1. Single-User Constraint vs. Open Registration
- **Source:** `spec.md` (Single-user for Sathya) vs. `development_plan.md` Use Case 1 (User Registration).
- **Ambiguity:** If the system is strictly for one user, leaving registration open poses a security/scope risk.
- **Resolution Needed:** Implement a mechanism to lock registration after the first user is created, or remove the Sign Up UI entirely in favor of a seeded database user.

## 2. "Fresh Slate" Testing vs. Permanent Historical Logs
- **Source:** `implementation_plan.md` Task 4.2 (Clear previous results) vs. `spec.md` Section 6.2 (All data preserved in history).
- **Ambiguity:** Hard-clearing test results from the database to achieve a "fresh slate" will permanently destroy the historical data required for the timeline view.
- **Resolution Needed:** Introduce a `cycle_id` or `attempt_number` in the `TestResults` schema. "Clearing" should only mean creating new blank records for the *current* cycle, allowing the system to query old test results using previous cycle IDs for the history view.

## 3. Effort Estimation Scale (>100%)
- **Source:** `spec.md` Section 4.2.
- **Ambiguity:** Effort is calculated as a percentage of an 8-hour day. It is undefined how tasks requiring more than 8 hours are handled.
- **Resolution Needed:** Explicitly define if the UI allows percentages > 100% (e.g., 200% for 16 hours), or if tasks taking longer than 8 hours must be broken down into smaller tasks.

## 4. Concurrent Modification (HTTP 409) in Single-User Environment
- **Source:** `development_plan.md` Use Case 14.
- **Ambiguity:** An exception flow for concurrent edits (Optimistic Concurrency Control) is planned. For a single-user system, this is likely over-engineering unless multiple device usage is a strict requirement.
- **Resolution Needed:** Decide whether to drop the HTTP 409 implementation to adhere to the simple "Caveman Distillate" philosophy, or keep it to support multi-tab usage.

## 5. Backlog "Top" Re-queue vs. Default Sorting
- **Source:** `spec.md` Section 5.1 (Sorting is Oldest Failed -> Newest Failed -> New) vs. Section 6.1 (Automatically move task to the very top).
- **Ambiguity:** If a user manually reorders the Backlog, and a task subsequently fails in Testing, does the automatic "move to top" respect the manual order, or does it trigger a complete re-sort of the column?
- **Resolution Needed:** Clarify the sorting algorithm priority. (Recommendation: Failed tasks receive a timestamp `failed_at`. The backlog always sorts by `failed_at DESC`, followed by manual `sort_order`).