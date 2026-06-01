# Project Implementation Plan: Simple Kanban Board

## 1. Introduction

This document outlines the implementation strategy for the Simple Kanban Board project. It breaks down the development process into logical phases, tasks, and activities based on the detailed requirements defined in `spec.md`. The goal is to provide a clear roadmap for building the application from the ground up.

---

## 2. Identified User Flows

The application's functionality can be categorized into the following primary user and system flows.

### 2.1. Authentication Flow
- **Sign Up**: A new user (Sathya) creates an account.
- **Login**: An existing user logs in with valid credentials to access the board.
- **Login Failure**: Access is denied if credentials are incorrect.

### 2.2. Linear (Happy Path) Workflow
This is the standard, sequential progression of a task from creation to completion without any failures.
1.  **Create Task**: Sathya creates a task, which appears in the `Backlog`.
2.  **Schedule Task**: Sathya moves the task to `Scheduled` and enters planning details.
3.  **Begin Work**: The task is moved to `Work In Progress`.
4.  **Log Work**: Sathya logs time and marks the task `Completed`.
5.  **Move to Testing**: The task is moved to the `Testing` column.
6.  **Pass All Tests**: Sathya logs `Passed` for all test cases.
7.  **Move to Deployed**: The task is moved to `Deployed` after entering deployment details.

### 2.3. Reverse (Test Failure) Flow
This flow is triggered automatically when a task fails quality assurance.
1.  **Log Test Failure**: In the `Testing` column, Sathya logs at least one test case as `Failed`.
2.  **Automatic Re-Queuing**: After all test results are submitted, the system automatically moves the task card back to the top of the `Backlog`.
3.  **Restart Cycle**: The task must go through the `Scheduled` and `Work In Progress` stages again before a new testing attempt.

### 2.4. Data Management Flows
- **View Task Details**: Sathya clicks any task card to open a detailed view showing all its associated data and history.
- **Edit Task**: Sathya edits a task's name, description, or test cases at any point in the workflow.
- **Reorder Tasks**: Sathya manually drags and drops tasks to change their vertical order within any column.

---

## 3. Implementation Phases and Tasks

The project will be developed in logical phases to ensure a structured build process.

### Phase 1: Foundation & Authentication
*Objective: Establish the project structure and secure user access.*
- **Task 1.1**: Set up the initial frontend and backend project structure.
- **Task 1.2**: Design and implement the database schema for `Users`.
- **Task 1.3**: Develop the UI and API for user **Sign Up**.
- **Task 1.4**: Develop the UI and API for user **Login**.
- **Task 1.5**: Implement authentication middleware and session management to protect board access.

### Phase 2: Core Board and Task Structure
*Objective: Build the main board interface and the basic task entity.*
- **Task 2.1**: Design and implement the database schema for `Tasks`, including fields for `task_id`, `name`, `description`, and `test_cases`.
- **Task 2.2**: Build the main board UI with the five static columns: `Backlog`, `Scheduled`, `Work In Progress`, `Testing`, `Deployed`.
- **Task 2.3**: Develop the "Create Task" UI/form.
- **Task 2.4**: Implement the backend API endpoint to create a new task.
- **Task 2.5**: Implement the logic to fetch and render tasks in their respective columns on the board.

### Phase 3: Workflow Transitions & Gated Modals
*Objective: Enable the core drag-and-drop functionality and the mandatory data entry gates.*
- **Task 3.1**: Integrate a drag-and-drop library to allow tasks to be moved between columns.
- **Task 3.2**: Develop the "Schedule Task" modal (`Start Date`, `End Date`, `Effort Required`).
- **Task 3.3**: Implement the gated transition from `Backlog` to `Scheduled`, including the logic to revert the move if the form is canceled.
- **Task 3.4**: Implement the transition from `Scheduled` to `Work In Progress`.
- **Task 3.5**: Implement the transition from `Work In Progress` to `Testing`, including the validation check for the 'Completed' status.
- **Task 3.6**: Develop the "Deployment Details" modal.
- **Task 3.7**: Implement the gated transition from `Testing` to `Deployed`.

### Phase 4: Column-Specific Functionality
*Objective: Build the unique features available within each column.*
- **Task 4.1**: Implement the `Work In Progress` features:
    - UI for logging time entries.
    - Backend logic to save time logs against a task.
    - UI element to toggle the work status between `Pending` and `Completed`.
- **Task 4.2**: Implement the `Testing` features:
    - UI to display the list of test cases for a given task.
    - UI for logging `Start_Time`, `End_Time`, and `Test_Status` for each test case.
    - Backend logic to save individual test results.
    - Implement the "fresh slate" logic to clear previous results when a task enters the column.
- **Task 4.3**: Implement the manual reordering (vertical drag-and-drop) of tasks within a single column.

### Phase 5: Automation, History, and Data Visibility
*Objective: Implement the automated reverse flow and the detailed data views.*
- **Task 5.1**: Implement the **Reverse Flow** automation:
    - Create a backend service that evaluates test results upon submission.
    - If a failure is detected, automatically update the task's column to `Backlog`.
- **Task 5.2**: Develop the "Detailed Task View" UI.
- **Task 5.3**: Implement the **Task History** log:
    - Design a schema for historical events (e.g., `TaskHistory` table).
    - Add logic to create a new history entry for every significant action (scheduling, work logs, test results, etc.).
    - Display the events in a single, chronological timeline in the detailed view.
- **Task 5.4**: Implement the **Baseline Time Tracking** view:
    - Fetch the initial `Effort Required` as the baseline.
    - Calculate the cumulative `Actual Time Spent` from all work logs.
    - Display the `Original Estimate`, `Actual Time Spent`, and calculated `Remaining Time` (which can be negative).

### Phase 6: Finalization and Edge Cases
*Objective: Polish the application and handle remaining use cases.*
- **Task 6.1**: Implement the generic "Edit Task" functionality, ensuring it's accessible from any column and correctly updates task details.
- **Task 6.2**: Implement the default priority sorting in the `Backlog` column (`Oldest Failed -> Newest Failed -> New Task`).
- **Task 6.3**: Conduct comprehensive end-to-end testing, focusing on all flows, edge cases (e.g., adding a test case while in the `Testing` column), and data integrity.
- **Task 6.4**: Perform final code cleanup, refactoring, and documentation review.