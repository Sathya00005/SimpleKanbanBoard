# Development Plan: Use Cases and Flows

Based on the project implementation plan, the following use cases have been identified in the logical order of their implementation. Each use case details the main flow, alternative flows, exception flows, and negative flows.

## 1. User Registration (Sign Up)
**Description:** A new user creates an account to access the Kanban board.
- **Main Flow:**
  1. User navigates to the Sign Up page.
  2. User enters a valid email and password.
  3. User submits the form.
  4. System creates the account and logs the user in (or redirects to Login).
- **Alternative Flows:**
  - User clicks a link to navigate to the Login page instead.
- **Exception Flows:**
  - Database connection fails during account creation; system displays a "Try again later" error message.
- **Negative Flows:**
  - User enters an email that is already registered; system displays an error message.
  - User enters a password that does not meet complexity requirements; system displays validation errors.
  - User submits the form with empty fields; system prevents submission and highlights required fields.

## 2. User Authentication (Login)
**Description:** An existing user logs into the system to view and manage tasks.
- **Main Flow:**
  1. User navigates to the Login page.
  2. User enters valid credentials (email and password).
  3. User submits the form.
  4. System authenticates the user and redirects to the Kanban board.
- **Alternative Flows:**
  - User clicks a link to navigate to the Sign Up page.
- **Exception Flows:**
  - System encounters an error while verifying credentials (e.g., database timeout); system displays an error message.
- **Negative Flows:**
  - User enters incorrect email or password; system displays "Invalid credentials" error.
  - User attempts to submit the form with missing fields; UI validations prevent submission.

## 3. View Board
**Description:** The authenticated user views the main Kanban board with all their tasks organized into columns.
- **Main Flow:**
  1. User accesses the main board URL.
  2. System fetches all tasks associated with the user.
  3. System renders the board with columns (`Backlog`, `Scheduled`, `Work In Progress`, `Testing`, `Deployed`) and places task cards in their respective columns based on their status.
  4. Tasks in `Backlog` are sorted by default priority (Oldest Failed -> Newest Failed -> New Task).
- **Alternative Flows:**
  - N/A (Standard data fetch).
- **Exception Flows:**
  - Backend API fails to return the task list; system displays an error state or a "Failed to load board" message.
- **Negative Flows:**
  - User attempts to access the board without an active session; system redirects to Login page.

## 4. Task Creation
**Description:** The user creates a new task in the Backlog.
- **Main Flow:**
  1. User clicks the "Create Task" button.
  2. System displays the task creation form.
  3. User enters task `name`, `description`, and optional `test_cases`.
  4. User submits the form.
  5. System saves the task and adds a new card to the bottom of the `Backlog` column (if no failed tasks exist).
- **Alternative Flows:**
  - User opens the form but clicks "Cancel" or closes it; the form closes without saving.
- **Exception Flows:**
  - Server fails to save the task; system alerts the user and keeps the form data intact for retry.
- **Negative Flows:**
  - User attempts to submit the form without a `name`; form validation fails and highlights the required field.

## 5. Manage Task Order (Reorder within Column)
**Description:** The user manually reorders tasks within a single column to prioritize them.
- **Main Flow:**
  1. User clicks and drags a task card vertically within its current column.
  2. User drops the card at the desired new position.
  3. System updates the UI immediately.
  4. System sends the new order to the backend in the background.
- **Alternative Flows:**
  - User drags a card but drops it in its original position; no backend update is triggered.
- **Exception Flows:**
  - Backend fails to save the new order; system notifies the user and reverts the task order in the UI to its previous state.
- **Negative Flows:**
  - N/A.

## 6. Task Scheduling (Move Backlog -> Scheduled)
**Description:** The user moves a task from Backlog to Scheduled, triggering a gated modal for planning details.
- **Main Flow:**
  1. User drags a task from `Backlog` and drops it into `Scheduled`.
  2. System detects the column change and opens the "Schedule Task" modal.
  3. User enters `Start Date`, `End Date`, and `Effort Required`.
  4. User clicks "Save".
  5. System saves the details, creates a history entry, and the task card remains in the `Scheduled` column.
- **Alternative Flows:**
  - User drops the task into `Scheduled`, the modal opens, but the user clicks "Cancel"; system reverts the task card back to the `Backlog` column.
- **Exception Flows:**
  - Backend fails to save the scheduling details; system displays an error in the modal, and if closed, reverts the task to `Backlog`.
- **Negative Flows:**
  - User attempts to save the modal with missing fields or an `End Date` that is before the `Start Date`; UI validations prevent submission.

## 7. Start Work (Move Scheduled -> WIP)
**Description:** The user moves a task from Scheduled to Work In Progress to indicate development has started.
- **Main Flow:**
  1. User drags a task from `Scheduled` and drops it into `Work In Progress`.
  2. System updates the task's status and logs a history entry.
  3. Task remains in `Work In Progress`.
- **Alternative Flows:**
  - User drags the task back to `Backlog` or leaves it in `Scheduled` (no status change).
- **Exception Flows:**
  - Backend fails to update the task status; system reverts the task back to `Scheduled` and shows an error message.
- **Negative Flows:**
  - N/A.

## 8. Log Work and Complete (WIP)
**Description:** The user logs time spent on a task and marks it as completed when development is done.
- **Main Flow:**
  1. User interacts with a task in the `Work In Progress` column.
  2. User adds one or more time log entries (date, hours spent, description).
  3. User toggles the work status from `Pending` to `Completed`.
  4. System saves the time logs, updates status, and logs a history entry.
- **Alternative Flows:**
  - User logs time entries but keeps the status as `Pending`.
  - User toggles status to `Completed`, realizes more work is needed, and toggles it back to `Pending`.
- **Exception Flows:**
  - Backend fails to save a time log or status update; system alerts the user that changes were not saved.
  - **Session Invalidation:** The user's session expires in the background while logging work. Upon submission, the API returns a 401 error. The system caches the unsaved time logs, prevents data loss, and prompts the user to re-login.
- **Negative Flows:**
  - User attempts to log negative time or invalid characters for time entries; UI validations reject the input.

## 9. Move to Testing (Move WIP -> Testing)
**Description:** The user moves a completed task from WIP to the Testing column.
- **Main Flow:**
  1. User drags a task (marked as `Completed`) from `Work In Progress` to `Testing`.
  2. System accepts the move, clears any previous test results for this task (fresh slate logic), and logs a history entry.
- **Alternative Flows:**
  - N/A.
- **Exception Flows:**
  - Backend fails to update the task status or clear previous results; system reverts the task back to `Work In Progress`.
- **Negative Flows:**
  - User attempts to drag a task marked as `Pending` into `Testing`; system rejects the drag operation and reverts the task to `Work In Progress` with a warning message ("Task must be marked Completed first").

## 10. Execute Tests (Testing)
**Description:** The user executes test cases and logs the results for a task in the Testing column.
- **Main Flow:**
  1. User views the test cases on a task in `Testing`.
  2. For each test case, the user logs `Start_Time`, `End_Time`, and selects a `Test_Status` (Passed/Failed).
  3. User marks all test cases as `Passed`.
  4. User submits the final test results.
  5. System saves the results and logs a history entry.
- **Alternative Flows:**
  - User adds or edits test cases while the task is in the `Testing` column before executing them.
  - User executes some tests and saves partial progress without completing all tests yet.
- **Exception Flows:**
  - Backend fails to save the test execution results; system displays an error and prompts retry.
- **Negative Flows:**
  - User attempts to submit final test results while some test cases are missing status or time information; UI validation requires all fields to be completed.
  - User attempts to log `End_Time` before `Start_Time`.

## 11. Automated Reverse Flow (Test Failure)
**Description:** The system automatically moves a task back to the Backlog if any test cases fail.
- **Main Flow:**
  1. User is logging test results (as in Use Case 10).
  2. User marks at least one test case as `Failed`.
  3. User completes and submits the results for all test cases.
  4. System backend evaluates the results, detects the failure, and automatically moves the task card to the very top of the `Backlog` column.
  5. System logs a history entry indicating test failure and re-queuing.
- **Alternative Flows:**
  - N/A (Automated system response).
- **Exception Flows:**
  - Backend fails to update the task's column after evaluating results; system throws an error and the task might incorrectly remain in `Testing` (requiring manual intervention or retry).
- **Negative Flows:**
  - N/A.

## 12. Deploy Task (Move Testing -> Deployed)
**Description:** The user moves a successfully tested task to the Deployed column, triggering a gated modal.
- **Main Flow:**
  1. User drags a task (where all tests passed) from `Testing` to `Deployed`.
  2. System detects the column change and opens the "Deployment Details" modal.
  3. User enters deployment notes, date, and environment details.
  4. User clicks "Save".
  5. System saves details, logs a history entry, and task remains in `Deployed`.
- **Alternative Flows:**
  - User drops the task into `Deployed`, modal opens, but user clicks "Cancel"; system reverts task back to `Testing`.
- **Exception Flows:**
  - Backend fails to save deployment details; system displays error in modal and reverts task to `Testing` if canceled.
- **Negative Flows:**
  - User attempts to submit the deployment modal without required details; UI validation prevents submission.
  - User attempts to drag a task with failed or incomplete tests from `Testing` to `Deployed`; system rejects the move and reverts to `Testing` with a warning message.

## 13. View Task Details and History
**Description:** The user views the comprehensive details, history, and time tracking of a specific task.
- **Main Flow:**
  1. User clicks on a task card in any column.
  2. System opens a Detailed Task View modal or pane.
  3. System fetches and displays all task metadata (name, description, test cases).
  4. System fetches and displays the chronological `Task History` (timeline of status changes, scheduling, testing).
  5. System calculates and displays `Baseline Time Tracking` (`Original Estimate`, total `Actual Time Spent` from work logs, and `Remaining Time`).
- **Alternative Flows:**
  - User views the details and closes the view without making changes.
- **Exception Flows:**
  - Backend fails to fetch task details, history, or time logs; system displays an error message within the detailed view.
- **Negative Flows:**
  - N/A.

## 14. Edit Task
**Description:** The user updates basic information of an existing task.
- **Main Flow:**
  1. User opens the Detailed Task View (or clicks an edit icon on the card).
  2. User modifies the task `name`, `description`, or `test_cases`.
  3. User clicks "Save changes".
  4. System updates the task data and reflects changes on the board.
- **Alternative Flows:**
  - User modifies details but clicks "Cancel"; system discards changes.
- **Exception Flows:**
  - Backend fails to save the updated task information; system displays an error and keeps the edit mode active with the user's input.
  - **Concurrent Task Updates:** The user attempts to save changes, but the task has been concurrently modified by another client. The backend rejects the request due to a version/timestamp mismatch (e.g., HTTP 409 Conflict), and the system alerts the user, prompting them to review the latest changes before overwriting.
- **Negative Flows:**
  - User attempts to save after clearing the `name` field; UI validation prevents submission.the `name` field; UI validation prevents submission.