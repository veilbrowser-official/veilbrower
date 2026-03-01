use tauri::State;
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::extensions::{
    ExtensionEntity, list_extensions, create_extension, delete_extension as db_delete_extension, update_extension_status
};

#[tauri::command]
pub async fn fetch_extensions(db: State<'_, DbPool>) -> Result<Vec<ExtensionEntity>, String> {
    list_extensions(&db).await.map_err(|e| format!("Failed to fetch extensions: {}", e))
}

#[tauri::command]
pub async fn add_extension(db: State<'_, DbPool>, extension: ExtensionEntity) -> Result<(), String> {
    create_extension(&db, &extension).await.map_err(|e| format!("Failed to add extension: {}", e))
}

#[tauri::command]
pub async fn set_extension_status(db: State<'_, DbPool>, id: String, status: String) -> Result<(), String> {
    update_extension_status(&db, &id, &status).await.map_err(|e| format!("Failed to update extension status: {}", e))
}

#[tauri::command]
pub async fn remove_extension(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    db_delete_extension(&db, &id).await.map_err(|e| format!("Failed to delete extension: {}", e))
}
