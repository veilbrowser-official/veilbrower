use crate::infrastructure::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ExtensionEntity {
    pub id: String,
    pub name: String,
    pub version: String,
    pub policy: String,
    pub status: String,
    pub storage_path: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

pub async fn list_extensions(pool: &DbPool) -> Result<Vec<ExtensionEntity>, sqlx::Error> {
    sqlx::query_as::<_, ExtensionEntity>("SELECT * FROM extensions ORDER BY updated_at DESC")
        .fetch_all(&pool.pool)
        .await
}

pub async fn create_extension(pool: &DbPool, ext: &ExtensionEntity) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO extensions (id, name, version, policy, status, storage_path, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
    .bind(&ext.id)
    .bind(&ext.name)
    .bind(&ext.version)
    .bind(&ext.policy)
    .bind(&ext.status)
    .bind(&ext.storage_path)
    .execute(&pool.pool)
    .await?;
    Ok(())
}

pub async fn update_extension_status(pool: &DbPool, id: &str, status: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE extensions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(status)
    .bind(id)
    .execute(&pool.pool)
    .await?;
    Ok(())
}

pub async fn delete_extension(pool: &DbPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM extensions WHERE id = ?").bind(id).execute(&pool.pool).await?;
    Ok(())
}
