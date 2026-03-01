use crate::infrastructure::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ContextEntity {
    pub id: String,
    pub name: String,
    pub os: String,
    pub browser: String,
    pub proxy_id: Option<String>,
    pub protections: String, // JSON array string
    pub status: String,
    pub last_active: Option<NaiveDateTime>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

pub async fn list_contexts(pool: &DbPool) -> Result<Vec<ContextEntity>, sqlx::Error> {
    let contexts = sqlx::query_as::<_, ContextEntity>(
        "SELECT * FROM contexts ORDER BY updated_at DESC"
    )
    .fetch_all(&pool.pool)
    .await?;

    Ok(contexts)
}

pub async fn get_context(pool: &DbPool, id: &str) -> Result<Option<ContextEntity>, sqlx::Error> {
    let context = sqlx::query_as::<_, ContextEntity>(
        "SELECT * FROM contexts WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(&pool.pool)
    .await?;

    Ok(context)
}

pub async fn create_context(pool: &DbPool, context: &ContextEntity) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO contexts (id, name, os, browser, proxy_id, protections, status, last_active, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
    .bind(&context.id)
    .bind(&context.name)
    .bind(&context.os)
    .bind(&context.browser)
    .bind(&context.proxy_id)
    .bind(&context.protections)
    .bind(&context.status)
    .bind(&context.last_active)
    .execute(&pool.pool)
    .await?;

    Ok(())
}

pub async fn update_context_status(pool: &DbPool, id: &str, status: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE contexts SET status = ?, last_active = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(status)
    .bind(id)
    .execute(&pool.pool)
    .await?;

    Ok(())
}

pub async fn delete_context(pool: &DbPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM contexts WHERE id = ?")
        .bind(id)
        .execute(&pool.pool)
        .await?;

    Ok(())
}
