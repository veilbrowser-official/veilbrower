use crate::infrastructure::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct IdentityEntity {
    pub id: String,
    pub domain: String,
    pub username: String,
    pub encrypted_password: Vec<u8>,
    pub session_cookies: Option<String>,
    pub session_storage: Option<String>,
    pub session_metadata: Option<String>,
    pub created_at: Option<NaiveDateTime>,
}

pub async fn list_identities(pool: &DbPool) -> Result<Vec<IdentityEntity>, sqlx::Error> {
    sqlx::query_as::<_, IdentityEntity>("SELECT * FROM identities ORDER BY created_at DESC")
        .fetch_all(&pool.pool)
        .await
}

#[allow(dead_code)]
pub async fn fetch_identity(pool: &DbPool, id: &str) -> Result<Option<IdentityEntity>, sqlx::Error> {
    sqlx::query_as::<_, IdentityEntity>("SELECT * FROM identities WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool.pool)
        .await
}

pub async fn create_identity(pool: &DbPool, identity: &IdentityEntity) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO identities (id, domain, username, encrypted_password, session_cookies, session_storage, session_metadata, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .bind(&identity.id)
    .bind(&identity.domain)
    .bind(&identity.username)
    .bind(&identity.encrypted_password)
    .bind(&identity.session_cookies)
    .bind(&identity.session_storage)
    .bind(&identity.session_metadata)
    .execute(&pool.pool)
    .await?;
    Ok(())
}

pub async fn delete_identity(pool: &DbPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM identities WHERE id = ?").bind(id).execute(&pool.pool).await?;
    Ok(())
}

pub async fn update_identity_cookies(pool: &DbPool, id: &str, cookies_json: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE identities SET session_cookies = ? WHERE id = ?")
        .bind(cookies_json)
        .bind(id)
        .execute(&pool.pool)
        .await?;
    Ok(())
}
