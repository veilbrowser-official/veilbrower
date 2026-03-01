/// Scheduler handles the concurrency and lifecycle of the agent tasks.
/// It will implement the logic needed for cooling down tasks and managing max concurrent limits.

#[allow(dead_code)]
pub struct TaskScheduler {
    pub max_concurrent_sessions: u32,
    pub active_sessions: u32,
}

impl TaskScheduler {
    pub fn new(max_concurrent_sessions: u32) -> Self {
        Self {
            max_concurrent_sessions,
            active_sessions: 0,
        }
    }
}
