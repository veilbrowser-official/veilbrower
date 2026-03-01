-- Create Extensions table
CREATE TABLE IF NOT EXISTS extensions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    policy TEXT NOT NULL, -- 'force_install', 'optional'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'disabled'
    storage_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
