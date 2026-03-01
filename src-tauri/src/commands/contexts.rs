use tauri::State;
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::contexts::{
    ContextEntity, create_context, list_contexts, get_context, update_context_status, delete_context
};

#[tauri::command]
pub async fn fetch_contexts(db: State<'_, DbPool>) -> Result<Vec<ContextEntity>, String> {
    list_contexts(&db).await.map_err(|e| format!("Failed to list contexts: {}", e))
}

#[tauri::command]
pub async fn fetch_context(db: State<'_, DbPool>, id: String) -> Result<Option<ContextEntity>, String> {
    get_context(&db, &id).await.map_err(|e| format!("Failed to get context: {}", e))
}

#[tauri::command]
pub async fn add_context(db: State<'_, DbPool>, context: ContextEntity) -> Result<(), String> {
    create_context(&db, &context).await.map_err(|e| format!("Failed to create context: {}", e))
}

#[tauri::command]
pub async fn set_context_status(db: State<'_, DbPool>, id: String, status: String) -> Result<(), String> {
    update_context_status(&db, &id, &status).await.map_err(|e| format!("Failed to update context status: {}", e))
}

#[tauri::command]
pub async fn remove_context(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    delete_context(&db, &id).await.map_err(|e| format!("Failed to delete context: {}", e))
}
