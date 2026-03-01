use crate::infrastructure::db::connection::DbPool;

pub async fn get_setting(pool: &DbPool, key: &str) -> Result<Option<String>, sqlx::Error> {
    let row: Option<(String,)> = sqlx::query_as("SELECT value FROM global_settings WHERE key = ?")
        .bind(key)
        .fetch_optional(&pool.pool)
        .await?;
        
    Ok(row.map(|r| r.0))
}

pub async fn set_setting(pool: &DbPool, key: &str, value: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO global_settings (key, value, updated_at) 
         VALUES (?, ?, CURRENT_TIMESTAMP) 
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(key)
    .bind(value)
    .execute(&pool.pool)
    .await?;
    
    Ok(())
}
