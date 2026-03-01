use tauri::{command, AppHandle, Manager, State, Emitter};
use crate::infrastructure::db::connection::DbPool;
use crate::infrastructure::db::repositories::settings;
use crate::infrastructure::db::repositories::contexts;
use crate::infrastructure::db::repositories::task_runs;
use crate::chrome::launcher::ChromeLauncher;
use crate::domain::engine::cdp_bridge::CdpBridge;
use crate::domain::engine::cdp_client::{StealthProfile, CdpClient};
use crate::infrastructure::port_manager::{PortManager, PortDomain};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

pub type CdpSessions = Arc<RwLock<HashMap<String, CdpClient>>>;
pub type AgentHistories = Arc<RwLock<HashMap<String, Vec<serde_json::Value>>>>;

#[command]
pub async fn get_global_setting(key: String, pool: State<'_, DbPool>) -> Result<Option<String>, String> {
    settings::get_setting(&pool, &key).await.map_err(|e| e.to_string())
}

#[command]
pub async fn set_global_setting(key: String, value: String, pool: State<'_, DbPool>) -> Result<(), String> {
    settings::set_setting(&pool, &key, &value).await.map_err(|e| e.to_string())
}

/// LLM 驱动的 ReAct Agent 主循环会话
async fn run_agent_session(
    app_handle: AppHandle,
    mission_id: String,
    prompt: String,
    skill_id: String,
    _cdp: CdpClient,
    agent_histories: AgentHistories,
    cdp_port: u16, // 本会话分配的动态端口，循环结束时释放
) {
    log::info!("[Agent][DIAG] ▶▶▶ run_agent_session 进入，mission_id={}", mission_id);
    let pool = app_handle.state::<DbPool>().inner().clone();
    let _ = task_runs::update_task_run_status(&pool, &mission_id, "RUNNING", None).await;
    log::info!("[Agent][DIAG] ✅ 状态已更新为 RUNNING");

    // ── 阶段1：在写锁内快速读取/清洗 history，然后立即释放锁 ──────────────
    // 关键：agent 运行期间不持有写锁，否则 MCP 工具中任何共享状态访问都可能死锁
    let mut history: Vec<serde_json::Value> = {
        let mut lock = agent_histories.write().await;
        let h = lock.entry(mission_id.clone()).or_insert_with(Vec::new);

        // 入口 history 清洗：移除上一轮残留的孤儿 tool_calls/tool 消息
        while let Some(last) = h.last() {
            let role = last.get("role").and_then(|r| r.as_str()).unwrap_or("");
            if role == "assistant" && last.get("tool_calls").is_some() {
                log::warn!("[Agent] 清理孤儿 assistant tool_calls 消息");
                h.pop();
            } else if role == "tool" {
                log::warn!("[Agent] 清理孤儿 tool 响应消息");
                h.pop();
            } else {
                break;
            }
        }

        // 追续任务：注入新的 user 指令
        if !h.is_empty() {
            h.push(serde_json::json!({
                "role": "user",
                "content": format!("用户新指令: '{}'. 在当前浏览器状态的基础上继续执行。", prompt)
            }));
        }

        // Clone 出来，然后写锁在此 block 结束时自动释放
        h.clone()
    }; // ← 写锁在这里释放！
    log::info!("[Agent][DIAG] ✅ 阶段1完成，history长度={}，写锁已释放", history.len());

    // ── 阶段2：初始化 Agent（无锁） ─────────────────────────────────────────
    let api_key = settings::get_setting(&pool, "llm.apiKey").await.unwrap_or_default().unwrap_or_default();
    let base_url = settings::get_setting(&pool, "llm.baseUrl").await.unwrap_or_default()
        .unwrap_or_else(|| "https://api.openai.com/v1".to_string());
    let model = settings::get_setting(&pool, "llm.model").await.unwrap_or_default()
        .unwrap_or_else(|| "gpt-4o".to_string());

    log::info!("[Agent][DIAG] LLM配置: base_url={}, model={}, api_key_len={}", base_url, model, api_key.len());
    let mcp_server = crate::infrastructure::mcp::tools::McpServer::new(app_handle.clone());
    mcp_server.set_active_profile(mission_id.clone()).await;
    log::info!("[Agent][DIAG] ✅ MCP Server 已创建，active_profile 已设置");

    let mcp = std::sync::Arc::new(mcp_server);
    let discovery = crate::domain::agent::discovery::DiscoveryService::new(
        mcp, api_key, base_url, model
    );

    let max_tool_calls: u32 = 50;
    let max_duration_secs: u64 = 480;

    // ── 阶段3：运行 Agent（无锁，history 在本地 Vec 上操作）────────────────
    log::info!("[Agent][DIAG] ▶▶▶ 即将进入 discovery.run_agent...");
    let app_handle_cb = app_handle.clone();
    let stop_reason = discovery.run_agent(
        &prompt,
        &mut history,
        max_tool_calls,
        std::time::Duration::from_secs(max_duration_secs),
        move |msg| {
            let _ = app_handle_cb.emit("agent_stream_chunk", serde_json::json!({
                "type": "thought",
                "chunk": msg
            }));
        }
    ).await;

    log::info!("[Agent] 循环结束，原因: {}", stop_reason);

    // ── 阶段4：将更新后的 history 存回（写锁短暂持有）───────────────────────
    {
        let mut lock = agent_histories.write().await;
        lock.insert(mission_id.clone(), history);
    }

    let final_status = match &stop_reason {
        crate::domain::agent::discovery::AgentStopReason::Completed(_) => "COMPLETED",
        _ => "STOPPED",
    };

    let _ = task_runs::update_task_run_status(&pool, &mission_id, final_status, None).await;

    // 释放占用的 CDP 端口
    if cdp_port != 9222 { // 9222 是默认端口，不由 PortManager 管理时不释放
        let port_manager = app_handle.state::<PortManager>();
        port_manager.release(cdp_port);
        log::info!("[Agent] 已释放 CDP 端口 {}", cdp_port);
    }

    let _ = app_handle.emit("agent_stream_chunk", serde_json::json!({
        "type": "card",
        "content": format!("Agent 已停止: {}", stop_reason),
        "cardData": {
            "missionId": mission_id,
            "skill": skill_id,
            "context": "Ephemeral macOS",
            "proxy": "Direct",
            "status": final_status
        }
    }));
    let _ = app_handle.emit("agent_stream_chunk", serde_json::json!({ "type": "end" }));
}



/// 内部启动逻辑，不依赖 State 封装，方便内部调用
pub async fn start_session_internal(
    mission_id: String, 
    skill_id: String,
    initial_prompt: Option<String>,
    app_handle: AppHandle, 
    pool: DbPool,
    launcher: ChromeLauncher,
    cdp_sessions: CdpSessions,
    agent_histories: AgentHistories
) -> Result<String, String> {
    log::info!("[Session] Starting session for mission: {}", mission_id);

    {
        let sessions = cdp_sessions.read().await;
        if sessions.contains_key(&mission_id) {
            return Ok(format!("Session {} already active", mission_id));
        }
    }

    let profile_id = &mission_id;

    // ── 动态分配 CDP 端口（支持多 Chrome 并发）────────────────────────────
    let port_manager = app_handle.state::<PortManager>();
    let cdp_port: u16 = match port_manager.acquire(PortDomain::Cdp, &mission_id) {
        Ok(p) => {
            log::info!("[Session] PortManager 分配 CDP 端口 {} 给 {}", p, mission_id);
            p
        }
        Err(e) => {
            log::warn!("[Session] PortManager 分配失败: {}，回退到默认端口 9222", e);
            9222
        }
    };

    // 获取 Stealth Profile 和 Proxy
    let (stealth_profile, proxy_url) = match contexts::get_context(&pool, profile_id).await {
        Ok(Some(profile_entity)) => {
            log::info!("[Session] Using existing context profile: {}", profile_id);
            let sp = StealthProfile::new_deterministic(&profile_entity.id, &profile_entity.os);
            
            let mut p_url = None;
            if let Some(pid) = profile_entity.proxy_id {
                if let Ok(Some(proxy_entity)) = crate::infrastructure::db::repositories::proxies::get_proxy(&pool, &pid).await {
                    let mut address = proxy_entity.address;
                    if !address.contains("://") {
                        address = format!("{}://{}", proxy_entity.protocol, address);
                    }
                    p_url = Some(address);
                    log::info!("[Session] Loaded proxy configuration: {:?}", p_url);
                }
            }
            (sp, p_url)
        }
        _ => {
            log::info!("[Session] Profile {} not found, using ephemeral default.", profile_id);
            (StealthProfile::new_deterministic(profile_id, "mac"), None)
        }
    };

    // ── 启动 Chrome（如果分配到的端口已有进程占用，跳过启动）────────────────
    let port_already_open = tokio::net::TcpStream::connect(
        format!("127.0.0.1:{}", cdp_port)
    ).await.is_ok();

    if port_already_open {
        log::info!("[Session] 端口 {} 已有 Chrome 在运行，跳过启动，直接连接。", cdp_port);
    } else {
        // 用动态分配的端口启动 Chrome
        use crate::chrome::launcher::LaunchOptions;
        let opts = LaunchOptions {
            cdp_port,
            proxy: proxy_url,
            ..LaunchOptions::default()
        };
        launcher.launch_with_options(profile_id, opts).map_err(|e| e.to_string())?;
        let bridge = CdpBridge::new(cdp_port);
        bridge.wait_for_port(10).await.map_err(|e| e.to_string())?;
        log::info!("[Session] Chrome 进程已在端口 {} 上启动并就绪。", cdp_port);
    }

    // ── 连接 CDP ──────────────────────────────────────────────────────────---
    log::info!("[Session] 正在连接 CDP (port={})...", cdp_port);
    match crate::domain::engine::cdp_client::CdpClient::connect_best_tab(
        cdp_port, Some(app_handle.clone()), Some(mission_id.clone())
    ).await {
        Ok(cdp) => {
            log::info!("[Session] CDP 连接成功，注入 Stealth...");
            cdp.init_stealth(&stealth_profile).await.map_err(|e| e.to_string())?;

            let _ = cdp.send_command("Page.startScreencast", serde_json::json!({
                "format": "jpeg", "quality": 50, "everyNthFrame": 2
            })).await;

            cdp_sessions.write().await.insert(mission_id.clone(), cdp.clone());

            let app_handle_clone = app_handle.clone();
            let mission_id_clone = mission_id.clone();
            let prompt = initial_prompt.unwrap_or_else(|| "Autonomous Exploration".to_string());
            let histories_clone = agent_histories.clone();

            log::info!("[Session] 正在 spawn run_agent_session...");
            tokio::spawn(async move {
                run_agent_session(app_handle_clone, mission_id_clone, prompt, skill_id, cdp, histories_clone, cdp_port).await;
            });

            Ok(format!("Session {} initialized", mission_id))
        }
        Err(e) => {
            log::error!("[Session] ❌ connect_best_tab 失败: {}。检查 Chrome 是否正常启动。", e);
            Err(format!("Failed to connect CDP: {}", e))
        }
    }
}


#[command]
pub async fn start_session(
    mission_id: String, 
    skill_id: String,
    initial_prompt: Option<String>,
    app_handle: AppHandle, 
    pool: State<'_, DbPool>,
    launcher: State<'_, ChromeLauncher>,
    cdp_sessions: State<'_, CdpSessions>,
    agent_histories: State<'_, AgentHistories>
) -> Result<String, String> {
    start_session_internal(
        mission_id, 
        skill_id, 
        initial_prompt, 
        app_handle, 
        pool.inner().clone(), 
        launcher.inner().clone(), 
        cdp_sessions.inner().clone(), 
        agent_histories.inner().clone()
    ).await
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCardPayload {
    pub mission_id: String,
    pub skill: String,
    pub skill_id: String,
    pub context: String,
    pub proxy: String,
    pub status: String,
}

#[command]
pub async fn send_agent_message(
    message: String, 
    mission_id: Option<String>,
    app_handle: AppHandle,
    cdp_sessions: State<'_, CdpSessions>,
    agent_histories: State<'_, AgentHistories>,
    pool: State<'_, DbPool>,
) -> Result<AgentCardPayload, String> {
    log::info!("Received NL Intent: {} (existing mission: {:?})", message, mission_id);
    
    let final_mission_id = if let Some(ref id) = mission_id {
        if !id.is_empty() { id.clone() } else { format!("TEMP-{}", rand::random::<u16>()) }
    } else {
        format!("TEMP-{}", rand::random::<u16>())
    };
    
    let _ = app_handle.emit("agent_stream_chunk", serde_json::json!({ "type": "start" }));
    
    let mut truly_reuse = false;
    if !final_mission_id.is_empty() {
        let sessions = cdp_sessions.read().await;
        if sessions.contains_key(&final_mission_id) {
            truly_reuse = true;
        }
    }

    let thought_prefix = if truly_reuse { "检测到活跃会话，正在接管现有浏览器窗口...\n" } else { "正在开启新任务会话...\n" };
    
    let _ = app_handle.emit("agent_stream_chunk", serde_json::json!({
        "type": "thought",
        "chunk": format!("收到意图: '{}'。{}", message, thought_prefix)
    }));

    let skill_id = "dynamic_query".to_string();
    let skill_name = "Dynamic Agent".to_string();

    let payload = AgentCardPayload {
        mission_id: final_mission_id.clone(),
        skill: skill_name,
        skill_id: skill_id.clone(),
        context: "Ephemeral macOS".to_string(),
        proxy: "Direct".to_string(),
        status: "RUNNING".to_string(),
    };

    if !truly_reuse {
        let _ = task_runs::create_task_run(&pool, &task_runs::TaskRunEntity {
            id: final_mission_id.clone(),
            status: "INITIALIZING".to_string(),
            proxy_mode: "Direct".to_string(),
            skill_id: Some(skill_id.clone()),
            context_id: Some("Ephemeral macOS".to_string()),
            error_code: None,
            created_at: None,
            updated_at: None,
        }).await;
    }

    let _ = app_handle.emit("agent_stream_chunk", serde_json::json!({
        "type": "card",
        "content": format!("Mission Active: {}", payload.skill),
        "cardData": &payload
    }));

    if truly_reuse {
        let sessions = cdp_sessions.read().await;
        if let Some(cdp) = sessions.get(&final_mission_id) {
            let app_clone = app_handle.clone();
            let mission_clone = final_mission_id.clone();
            let prompt_clone = message.clone();
            let cdp_clone = cdp.clone();
            let histories_clone = agent_histories.inner().clone();
            
            tokio::spawn(async move {
                // 复用已有会话：端口由原始 session 持有，传 9222 作为占位（不触发 PortManager 释放）
                run_agent_session(app_clone, mission_clone, prompt_clone, skill_id, cdp_clone, histories_clone, 9222).await;
            });
        }
    } else {
        let app_clone = app_handle.clone();
        let mission_clone = final_mission_id.clone();
        let prompt_clone = message.clone();
        let pool_handle = pool.inner().clone();
        let launcher = app_handle.state::<ChromeLauncher>().inner().clone();
        let sessions_handle = cdp_sessions.inner().clone();
        let histories_handle = agent_histories.inner().clone();

        tokio::spawn(async move {
            let _ = start_session_internal(
                mission_clone, 
                skill_id, 
                Some(prompt_clone), 
                app_clone, 
                pool_handle, 
                launcher,
                sessions_handle,
                histories_handle
            ).await;
        });
    }

    Ok(payload)
}

#[command]
pub async fn stop_session(session_id: String) -> Result<String, String> {
    Ok(format!("Session {} terminated", session_id))
}
