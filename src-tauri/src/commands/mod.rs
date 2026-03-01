use tauri::{AppHandle, Manager};
use crate::chrome::launcher::ChromeLauncher;
use crate::domain::engine::cdp_bridge::CdpBridge;
use crate::domain::engine::cdp_client::{CdpClient, StealthProfile};
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::contexts as db_contexts;

pub mod skills;
pub mod contexts;
pub mod proxies;
pub mod artifacts;
pub mod extensions;
pub mod task_runs;

/// 启动 标准 Chrome 浏览器
/// 支持 headless、viewport、proxy、stealth_level 等完整启动配置
#[tauri::command]
pub async fn launch_browser(
    url: String,
    profile_id: String,
    app_handle: AppHandle,
    // 可选的启动配置（未提供时使用安全默认值）
    headless: Option<bool>,
    viewport_width: Option<u32>,
    viewport_height: Option<u32>,
    proxy: Option<String>,
    stealth_level: Option<String>,
) -> Result<u32, String> {
    let pool = app_handle.state::<DbPool>();
    let launcher = app_handle.state::<ChromeLauncher>();
    log::info!("[Command] launch_browser: profile={}, headless={:?}, stealth={:?}",
        profile_id, headless, stealth_level);

    // 构建启动选项
    let opts = crate::chrome::launcher::LaunchOptions {
        headless: headless.unwrap_or(false),
        cdp_port: 9222, // 前端直接调用时使用默认端口；Agent 路径由 PortManager 分配动态端口
        viewport_width: viewport_width.unwrap_or(1440),
        viewport_height: viewport_height.unwrap_or(900),
        proxy: proxy.filter(|p| !p.is_empty()),
        stealth_level: stealth_level.unwrap_or_else(|| "high".to_string()),
        initial_url: "about:blank".to_string(),
    };

    // 获取 Stealth Profile
    let stealth_profile = match db_contexts::get_context(&pool, &profile_id).await {
        Ok(Some(p)) => StealthProfile::new_deterministic(&p.id, &p.os),
        _ => {
            log::info!("[Command] Profile {} not found in DB, using ephemeral stealth profile.", profile_id);
            StealthProfile::new_deterministic(&profile_id, "mac")
        }
    };

    // 1. 用完整选项启动 Chrome（先加载 about:blank，avoid 目标页 JS 早于 stealth 运行）
    let pid = launcher
        .launch_with_options(&profile_id, opts)
        .map_err(|e| format!("启动 Chrome 失败: {}", e))?;

    // 2. 等待 CDP 端口就绪
    let cdp_port = 9222;
    let bridge = CdpBridge::new(cdp_port);
    bridge.wait_for_port(10).await.map_err(|e| e.to_string())?;

    // 3. 接入 CDP 并注入 Stealth
    if let Ok(cdp) = CdpClient::connect_best_tab(cdp_port, Some(app_handle.clone()), None).await {
        log::info!("✅ [CDP] Connected to underlying core page.");
        cdp.init_stealth(&stealth_profile).await
            .map_err(|e| format!("Stealth Init Failed: {}", e))?;
        log::info!("✅ [CDP] Stealth injected: HashSeed={}", stealth_profile.canvas_noise_seed);

        let cdp_sessions = app_handle.state::<std::sync::Arc<tokio::sync::RwLock<std::collections::HashMap<String, CdpClient>>>>();
        cdp_sessions.inner().write().await.insert(profile_id.clone(), cdp.clone());

        // 4. Stealth 生效后再跳转目标 URL
        if !url.is_empty() && url != "about:blank" {
            cdp.navigate(&url).await
                .map_err(|e| format!("Navigation Failed: {}", e))?;
            log::info!("✅ [CDP] Navigated to {}", url);
        }
    } else {
        return Err("❌ [CDP] 无法连接至浏览器，请检查端口是否被占用。".to_string());
    }

    Ok(pid)
}


/// 动态获取 LLM 模型列表 (兼容 OpenAI 标准的 /models 接口)
#[tauri::command]
pub async fn fetch_llm_models(
    base_url: String,
    api_key: String,
) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let clean_url = base_url.trim_end_matches('/');
    let url = format!("{}/models", clean_url);
    
    let mut req = client.get(&url);
    if !api_key.is_empty() {
        req = req.bearer_auth(&api_key);
    }
    
    match req.send().await {
        Ok(res) => {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    let mut models = Vec::new();
                    
                    if let Some(data) = json.get("data").and_then(|d| d.as_array()) {
                        for item in data {
                            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                                models.push(id.to_string());
                            } else if let Some(id_val) = item.get("id") {
                                models.push(id_val.to_string().replace("\"", ""));
                            } else if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                models.push(name.to_string());
                            }
                        }
                    } else if let Some(data) = json.get("models").and_then(|d| d.as_array()) {
                        for item in data {
                            if let Some(id) = item.get("id").and_then(|i| i.as_str()) {
                                models.push(id.to_string());
                            } else if let Some(name) = item.get("name").and_then(|n| n.as_str()) {
                                models.push(name.to_string());
                            }
                        }
                    }
                    
                    if !models.is_empty() {
                        log::info!("[LLM Models] Successfully fetched {} models", models.len());
                        return Ok(models);
                    }
                    // Debug print the actual JSON to see why it failed to match
                    let preview = serde_json::to_string(&json).unwrap_or_default().chars().take(200).collect::<String>();
                    Err(format!("No models found in the standard 'data' array. JSON preview: {}...", preview))
                } else {
                    Err("Failed to parse JSON response.".to_string())
                }
            } else {
                Err(format!("API returned status: {}", res.status()))
            }
        },
        Err(e) => Err(format!("Network error: {}", e))
    }
}


