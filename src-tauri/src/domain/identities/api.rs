use tauri::{command, State};
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::identities::{
    IdentityEntity, list_identities, create_identity, delete_identity as db_delete_identity, update_identity_cookies as db_update_identity_cookies
};

#[command]
pub async fn get_identities(db: State<'_, DbPool>) -> Result<Vec<IdentityEntity>, String> {
    list_identities(&db).await.map_err(|e| format!("Failed to fetch identities: {}", e))
}

#[command]
pub async fn add_identity(
    db: State<'_, DbPool>, 
    id: String, 
    domain: String, 
    username: String, 
    password: String
) -> Result<(), String> {
    // Mock AES encryption: just convert password to bytes
    let encrypted_password = password.into_bytes();
    
    let ident = IdentityEntity {
        id,
        domain,
        username,
        encrypted_password,
        session_cookies: None,
        session_storage: None,
        session_metadata: None,
        created_at: None,
    };
    
    create_identity(&db, &ident).await.map_err(|e| format!("Failed to insert identity: {}", e))
}

#[command]
pub async fn update_identity_cookies(
    db: State<'_, DbPool>, 
    id: String, 
    cookies_json: String
) -> Result<(), String> {
    db_update_identity_cookies(&db, &id, &cookies_json)
        .await
        .map_err(|e| format!("Failed to update identity cookies: {}", e))
}

#[command]
pub async fn delete_identity(db: State<'_, DbPool>, id: String) -> Result<(), String> {
    db_delete_identity(&db, &id).await.map_err(|e| format!("Failed to delete identity: {}", e))
}

#[command]
pub async fn get_identity(id: String) -> Result<String, String> {
    println!("Fetching identity internally for: {}", id);
    // In real implementation, this reads from sqlite and decrypts via AES-GCM
    Ok("MockDecryptedData".into())
}
