-- Task Core Table
CREATE TABLE tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    column_status VARCHAR(50) DEFAULT 'Backlog', -- Backlog, Scheduled, WIP, Testing, Deployed
    priority_order SERIAL, -- For sorting: Oldest Failed -> Newest Failed -> New
    
    -- Scheduled Details
    start_date DATE,
    end_date DATE,
    effort_required_pct INT, -- Represents percentage of 8-hour day
    
    -- Work In Progress Details
    work_status VARCHAR(20) DEFAULT 'Pending', -- Pending, Completed
    
    -- Deployment Details
    deployed_time TIMESTAMP,
    deployment_type VARCHAR(50), -- feature_update, new_version, subversion, minor_patch
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Cases (Supports cyclical "Fresh Slate" via cycle_id)
CREATE TABLE test_cases (
    test_case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id),
    cycle_id INT DEFAULT 1, -- Increments when a task returns from Backlog -> Testing
    description TEXT NOT NULL,
    test_status VARCHAR(20) DEFAULT 'Pending', -- Passed, Failed, Pending
    start_time TIMESTAMP,
    end_time TIMESTAMP
);

-- Time Logging (WIP)
CREATE TABLE time_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id),
    log_date DATE NOT NULL,
    time_spent_minutes INT NOT NULL, -- Stored natively in minutes for accuracy
    description TEXT
);

-- Unified Chronological Task History
CREATE TABLE task_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(task_id),
    event_type VARCHAR(100) NOT NULL, -- e.g., CREATED, MOVED_TO_WIP, TEST_FAILED, DEPLOYED
    event_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);