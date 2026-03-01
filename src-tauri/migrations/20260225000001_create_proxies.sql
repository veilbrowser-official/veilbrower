-- Create Proxies table
CREATE TABLE IF NOT EXISTS proxies (
    id TEXT PRIMARY KEY NOT NULL,
    alias TEXT NOT NULL,
    protocol TEXT NOT NULL, -- 'SOCKS5', 'HTTP', 'SSH'
    address TEXT NOT NULL,  -- 'ip:port'
    geo TEXT,
    latency INTEGER,
    status TEXT NOT NULL DEFAULT 'offline', -- 'connected', 'offline'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
