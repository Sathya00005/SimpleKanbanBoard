# Project Specification: Simple Kanban Board for Sathya

## 1. High-Level Concept

This document outlines the specifications for a simple, single-user Kanban board designed for Sathya. The core principles are manual user control, clear visibility of the task lifecycle, and a complete, unalterable history for every task. The system prioritizes simplicity and a strict, sequential workflow over complex automation.

### 1.1. Authentication and Access
- The application requires a secure **SignUp and Login** mechanism.
- Only authenticated users (Sathya) can access the board to view or manipulate tasks.

---

## 2. Board Architecture

The Kanban board consists of five distinct columns through which tasks must move sequentially.

1.  **Backlog**: The starting point for all new ideas and tasks. Failed tasks also return here.
2.  **Scheduled**: Tasks that have been committed to, with a defined plan and timeline.
3.  **Work In Progress**: Tasks that are actively being worked on.
4.  **Testing**: Completed tasks that are undergoing quality assurance.
5.  **Deployed**: Tasks that have successfully passed testing and are released.

---

## 3. Task Definition and Lifecycle

### 3.1. Task Creation
- A task is created with three initial pieces of information:
  - `Task ID` (A system-generated, unique identifier for permanent tracking)
  - `Task Name` (a short title)
  - `Task Description` (details of the work)
  - `Test Cases` (a list of specific validation criteria)
- Upon creation, the task card appears in the **Backlog** column.

### 3.2. Task Permanence
- Once a task is created, it **cannot be deleted** from the board. It exists as a permanent record.
- Obsolete or irrelevant tasks will remain in the **Backlog** indefinitely, to be managed manually by Sathya.

### 3.3. Task Editing
- Sathya has the ability to edit a task's core details (`Task Name`, `Description`, `Test Cases`) at **any stage** of the workflow, regardless of the column it is in.
- Modifying a task's scope (e.g., adding a new test case) will not automatically move the task. It remains in its current column, and Sathya is trusted to handle the updated requirements.

---

## 4. User Interaction and Workflow Rules

### 4.1. Manual Control
- Sathya has complete manual control to **drag and reorder** task cards within **any** of the five columns. The visual order of tasks is entirely at his discretion.

### 4.2. Gated Column Transitions
- Moving a task between columns is a "gated" process that requires mandatory data entry at specific points. The move is only completed upon successful data submission.
- **Backlog -> Scheduled**:
  - A form **must** appear to collect `Start Date`, `End Date`, and `Effort Required`.
  - The `Effort Required` is a flexible percentage input (e.g., 30%, 65%) representing a portion of an 8-hour day.
  - If Sathya cancels this form, the task automatically returns to its original position in the **Backlog**.
- **Work In Progress -> Testing**:
  - The move is only permitted if the task's internal work status has been set to **'Completed'**.
- **Testing -> Deployed**:
  - A form **must** appear to collect `Deployment Details`.
  - If Sathya cancels this form, the task automatically returns to its original position in the **Testing** column.

---

## 5. Column-Specific Processes

### 5.1. Backlog
- **Priority Sorting**: The system will suggest a default order: `Oldest Failed Task -> Newest Failed Task -> New Task`. However, Sathya can manually override this order at any time.

### 5.2. Work In Progress
- **Time Logging**: Sathya can make multiple, separate time log entries for a task while it is in this column.
- **Work Status**: Sathya can freely toggle the task's status between **'Pending'** and **'Completed'**.

### 5.3. Testing
- **Granular Test Logging**: For a task to be evaluated, Sathya must log a result for **every** predefined test case.
- **Individual Logs**: Each test case log is a separate entry containing its own `Start_Time`, `End_Time`, and `Test_Status` ('Passed' or 'Failed').
- **Evaluation Trigger**: The system waits until results for **all** test cases have been submitted before evaluating the outcome.
- **Fresh Slate**: Each time a task enters the 'Testing' column (including after a failure), it is a blank slate. All test cases must be re-validated from scratch.

### 5.4. Deployed
- This is the final, permanent location for successfully completed tasks. There is no archiving or hiding functionality.

---

## 6. Special Flows

### 6.1. Reverse Flow (Test Failure)
- If, after all test results are submitted, one or more test cases are marked as **'Failed'**, the system will **automatically** move the entire task card back to the top of the **Backlog** column.
- The task is flagged with high priority, though Sathya can manually reorder it.

### 6.2. Data Handling for Failed Cycles
- When a failed task is rescheduled, the scheduling form will appear **blank**. Sathya must enter entirely new details for the new attempt.
- All data from the previous failed attempt (scheduling, work logs, test results) is preserved in the task's history.

---

## 7. Data History and Visibility

### 7.1. Task History
- Every task maintains a **single, continuous, chronological log** of all events. This includes every scheduling detail, work log, test result, and deployment log from all attempts (both failed and successful) in one unified timeline.

### 7.2. Time Tracking Visibility (Baseline Model)
- **Main Board View**: The main Kanban board will have a clean interface. No time tracking data (estimated vs. actual) is displayed on the cards.
- **Detailed Task View**: This information is only presented when Sathya clicks to open a task's detailed view.
- **Baseline Tracking Rules**:
  - **Original Estimate**: The very first `Effort Required` value set for the task is **locked** as the permanent baseline. It does not change on subsequent attempts.
  - **Actual Time Spent**: This is a **cumulative grand total** of all time logged across all attempts (recorded in hours and minutes). It does not reset after a failure.
  - **Remaining Time**: This is always calculated as `(Original Estimate converted to hours) - (Cumulative Actual Time Spent in hours)`. For example, a 50% effort (4 hours) minus 2 hours and 30 minutes logged equals 1 hour and 30 minutes remaining. It can become a negative value, clearly flagging a budget overrun.