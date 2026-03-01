use crate::domain::skills::models::SkillInfo;
use tauri::AppHandle;

use anyhow::Result;

#[tauri::command]
pub async fn get_skills() -> Result<Vec<SkillInfo>, String> {
    let base_dir = std::env::current_dir().unwrap().join("../skills_library");
    let store = crate::domain::skills::store::SkillStore::new(&base_dir);
    
    let mut skills = Vec::new();
    
    if let Ok(entries) = std::fs::read_dir(&base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Ok(sub_entries) = std::fs::read_dir(&path) {
                    for sub_entry in sub_entries.flatten() {
                        let sub_path = sub_entry.path();
                        if sub_path.extension().and_then(|e| e.to_str()) == Some("md") {
                            let rel_path = sub_path.strip_prefix(&base_dir).unwrap().to_string_lossy().to_string();
                            if let Ok(script) = store.load_skill(&rel_path) {
                                skills.push(SkillInfo {
                                    id: rel_path.clone(),
                                    name: script.name.clone(),
                                    description: script.description.clone(),
                                    category: script.category.clone(),
                                    script,
                                });
                            }
                        }
                    }
                }
            } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                let rel_path = path.strip_prefix(&base_dir).unwrap().to_string_lossy().to_string();
                if let Ok(script) = store.load_skill(&rel_path) {
                    skills.push(SkillInfo {
                        id: rel_path.clone(),
                        name: script.name.clone(),
                        description: script.description.clone(),
                        category: script.category.clone(),
                        script,
                    });
                }
            }
        }
    }
    
    Ok(skills)
}

#[tauri::command]
pub async fn save_skill(_rel_path: String, _content: String) -> Result<(), String> {
    // Needs proper implementation in store later
    Ok(())
}

#[tauri::command]
pub async fn run_skill(
    skill_id: String, 
    app_handle: AppHandle,
    pool: tauri::State<'_, crate::infrastructure::db::connection::DbPool>,
    launcher: tauri::State<'_, crate::chrome::launcher::ChromeLauncher>,
    cdp_sessions: tauri::State<'_, crate::domain::agent::api::CdpSessions>,
    agent_histories: tauri::State<'_, crate::domain::agent::api::AgentHistories>
) -> Result<String, String> {
    let mission_id = format!("MANUAL-{}", rand::random::<u16>());
    crate::domain::agent::api::start_session(mission_id, skill_id, None, app_handle, pool, launcher, cdp_sessions, agent_histories).await
}
