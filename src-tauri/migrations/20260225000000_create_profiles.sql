-- Create Profiles (Identities) table
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    os TEXT NOT NULL,
    browser TEXT NOT NULL,
    proxy_id TEXT,
    protections TEXT NOT NULL, -- Stored as JSON array string
    status TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'running'
    last_active DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
