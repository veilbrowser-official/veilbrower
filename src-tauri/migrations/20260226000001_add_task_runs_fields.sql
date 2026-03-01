-- Phase 8 Task Pipeline Integration
-- Add custom fields to browser_sessions to track AI task executions (Task Runs UI)

ALTER TABLE browser_sessions ADD COLUMN skill_id TEXT;
ALTER TABLE browser_sessions ADD COLUMN context_id TEXT;
ALTER TABLE browser_sessions ADD COLUMN error_code TEXT;
