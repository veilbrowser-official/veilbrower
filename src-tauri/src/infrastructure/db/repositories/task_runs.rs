use crate::infrastructure::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct TaskRunEntity {
    pub id: String,
    pub status: String,
    pub proxy_mode: String,
    pub skill_id: Option<String>,
    pub context_id: Option<String>,
    pub error_code: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

pub async fn list_task_runs(pool: &DbPool) -> Result<Vec<TaskRunEntity>, sqlx::Error> {
    let task_runs = sqlx::query_as::<_, TaskRunEntity>(
        "SELECT * FROM browser_sessions ORDER BY created_at DESC LIMIT 50"
    )
    .fetch_all(&pool.pool)
    .await?;

    Ok(task_runs)
}

pub async fn create_task_run(pool: &DbPool, task: &TaskRunEntity) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO browser_sessions (id, status, proxy_mode, skill_id, context_id, error_code, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
    .bind(&task.id)
    .bind(&task.status)
    .bind(&task.proxy_mode)
    .bind(&task.skill_id)
    .bind(&task.context_id)
    .bind(&task.error_code)
    .execute(&pool.pool)
    .await?;

    Ok(())
}

pub async fn update_task_run_status(pool: &DbPool, id: &str, status: &str, error_code: Option<String>) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE browser_sessions SET status = ?, error_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(status)
    .bind(&error_code)
    .bind(id)
    .execute(&pool.pool)
    .await?;

    Ok(())
}
