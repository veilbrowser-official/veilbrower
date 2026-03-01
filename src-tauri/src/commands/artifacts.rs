use tauri::State;
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::artifacts::{
    ArtifactEntity, list_artifacts, create_artifact, delete_artifact as db_delete_artifact
};

#[tauri::command]
pub async fn fetch_artifacts(db: State<'_, DbPool>) -> Result<Vec<ArtifactEntity>, String> {
    list_artifacts(&db).await.map_err(|e| format!("Failed to fetch artifacts: {}", e))
}

#[tauri::command]
pub async fn add_artifact(db: State<'_, DbPool>, artifact: ArtifactEntity) -> Result<(), String> {
    create_artifact(&db, &artifact).await.map_err(|e| format!("Failed to add artifact: {}", e))
}

#[tauri::command]
pub async fn remove_artifact(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    db_delete_artifact(&db, &id).await.map_err(|e| format!("Failed to delete artifact: {}", e))
}
