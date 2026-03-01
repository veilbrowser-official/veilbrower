use tauri::State;
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::proxies::{
    ProxyEntity, create_proxy, list_proxies, delete_proxy, update_proxy_status
};

#[tauri::command]
pub async fn fetch_proxies(db: State<'_, DbPool>) -> Result<Vec<ProxyEntity>, String> {
    list_proxies(&db).await.map_err(|e| format!("Failed to list proxies: {}", e))
}

#[tauri::command]
pub async fn add_proxy(db: State<'_, DbPool>, proxy: ProxyEntity) -> Result<(), String> {
    create_proxy(&db, &proxy).await.map_err(|e| format!("Failed to add proxy: {}", e))
}

#[tauri::command]
pub async fn remove_proxy(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    delete_proxy(&db, &id).await.map_err(|e| format!("Failed to delete proxy: {}", e))
}

#[tauri::command]
pub async fn set_proxy_status(db: State<'_, DbPool>, id: String, status: String, latency: Option<i32>) -> Result<(), String> {
    update_proxy_status(&db, &id, &status, latency).await.map_err(|e| format!("Failed to update proxy status: {}", e))
}
