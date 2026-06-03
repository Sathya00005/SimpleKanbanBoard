-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    test_cases TEXT,
    status TEXT DEFAULT 'Backlog', -- 'Backlog', 'Scheduled', 'Work In Progress', 'Testing', 'Deployed'
    
    -- Scheduled Details
    start_date DATETIME,
    end_date DATETIME,
    effort_required INTEGER, -- Allowed Values: 25, 50, 75, 100
    
    -- Work In Progress Details
    time_spent_minutes INTEGER,
    work_status TEXT, -- 'Pending', 'Completed'
    
    -- Testing Details
    test_start_time DATETIME,
    test_end_time DATETIME,
    test_status TEXT, -- 'Passed', 'Failed'
    
    -- Deployment Details
    deployed_time DATETIME,
    deployment_type TEXT, -- 'feature_update', 'new_version', 'subversion', 'minor_patch'
    
    -- Cycle History & Sorting rules
    failure_count INTEGER DEFAULT 0, -- Used to prioritize oldest failed tasks
    history JSON, -- Used to store historical cycle states (Scheduled, WIP, Test data) upon moving back to Backlog
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);