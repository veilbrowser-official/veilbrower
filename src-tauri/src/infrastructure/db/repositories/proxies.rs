use crate::infrastructure::db::connection::DbPool;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProxyEntity {
    pub id: String,
    pub alias: String,
    pub protocol: String,
    pub address: String,
    pub geo: Option<String>,
    pub latency: Option<i32>,
    pub status: String,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

pub async fn list_proxies(pool: &DbPool) -> Result<Vec<ProxyEntity>, sqlx::Error> {
    sqlx::query_as::<_, ProxyEntity>("SELECT * FROM proxies ORDER BY updated_at DESC")
        .fetch_all(&pool.pool)
        .await
}

pub async fn get_proxy(pool: &DbPool, id: &str) -> Result<Option<ProxyEntity>, sqlx::Error> {
    sqlx::query_as::<_, ProxyEntity>("SELECT * FROM proxies WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool.pool)
        .await
}

pub async fn create_proxy(pool: &DbPool, proxy: &ProxyEntity) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO proxies (id, alias, protocol, address, geo, latency, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
    .bind(&proxy.id)
    .bind(&proxy.alias)
    .bind(&proxy.protocol)
    .bind(&proxy.address)
    .bind(&proxy.geo)
    .bind(proxy.latency)
    .bind(&proxy.status)
    .execute(&pool.pool)
    .await?;
    Ok(())
}

pub async fn update_proxy_status(pool: &DbPool, id: &str, status: &str, latency: Option<i32>) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE proxies SET status = ?, latency = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(status)
    .bind(latency)
    .bind(id)
    .execute(&pool.pool)
    .await?;
    Ok(())
}

pub async fn delete_proxy(pool: &DbPool, id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM proxies WHERE id = ?").bind(id).execute(&pool.pool).await?;
    Ok(())
}
