-- Phase 8: Architectural Realignment
-- Convert old "Anti-Detect Browser" concepts (profiles, credentials) to "Agent OS" concepts (contexts, identities)

-- 1. Rename 'profiles' to 'contexts' (Wait, SQLite doesn't support renaming tables with foreign keys cleanly in older versions, but ALTER TABLE RENAME TO works generally. We'll use the safe approach of creating a new table and copying data if needed, or just ALTER TABLE).
-- Let's try simple ALTER TABLE first.
ALTER TABLE profiles RENAME TO contexts;

-- 2. Rename 'credentials_vault' to 'identities'
ALTER TABLE credentials_vault RENAME TO identities;

-- 3. Add new fields to 'identities' for Agent OS Session Replay (Cookies, Storage)
-- We use TEXT to store JSON serialized strings.
ALTER TABLE identities ADD COLUMN session_cookies TEXT;
ALTER TABLE identities ADD COLUMN session_storage TEXT;
ALTER TABLE identities ADD COLUMN session_metadata TEXT;

-- 4. Update any old foreign keys or column names if necessary
-- Note: browser_sessions and artifacts already exist, we leave them as is for now since they represent active CDP sessions and files.
