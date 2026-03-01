use tauri::State;
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::task_runs::{
    TaskRunEntity, list_task_runs
};

#[tauri::command]
pub async fn fetch_task_runs(db: State<'_, DbPool>) -> Result<Vec<TaskRunEntity>, String> {
    list_task_runs(&db).await.map_err(|e| format!("Failed to list task runs: {}", e))
}
