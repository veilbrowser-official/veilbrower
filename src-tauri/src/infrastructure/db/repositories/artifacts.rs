use crate::infrastructure::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ArtifactEntity {
    pub id: String,
    pub session_id: String,
    pub r#type: String, // 'screenshot', 'storage_snapshot', 'report'
    pub storage_path: String,
    pub created_at: Option<NaiveDateTime>,
}

pub async fn list_artifacts(pool: &DbPool) -> Result<Vec<ArtifactEntity>, sqlx::Error> {
    sqlx::query_as::<_, ArtifactEntity>("SELECT * FROM artifacts ORDER BY created_at DESC")
        .fetch_all(&pool.pool)
        .await
}

pub async fn create_artifact(pool: &DbPool, artifact: &ArtifactEntity) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO artifacts (id, session_id, type, storage_path, created_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .bind(&artifact.id)
    .bind(&artifact.session_id)
    .bind(&artifact.r#type)
    .bind(&artifact.storage_path)
    .execute(&pool.pool)
    .await?;
    Ok(())
}

pub async fn delete_artifact(pool: &DbPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM artifacts WHERE id = ?").bind(id).execute(&pool.pool).await?;
    Ok(())
}
