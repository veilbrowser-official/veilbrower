#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod domain;
mod infrastructure;
mod commands;
mod chrome; // 之前是 mod cef;

use domain::agent;
use domain::identities;
use domain::gateway;
use tauri::Manager;
use chrome::launcher::ChromeLauncher;

// 这个指令由前端 (SolidJS onMount) 调用
#[tauri::command]
async fn close_splashscreen(window: tauri::Window) {
  // 获取原有的闪屏窗口并将其关闭
  if let Some(splashscreen) = window.get_webview_window("splashscreen") {
    splashscreen.close().unwrap();
  }
  // 将隐藏的主窗口显示出来
  window.get_webview_window("main").unwrap().show().unwrap();
}

fn main() {
    // 初始化日志
    infrastructure::logger::init_logger();
    
    let port_manager = infrastructure::port_manager::PortManager::new();
    
    tauri::Builder::default()
        .setup(|app| {
            // 获取应用专属的数据目录（安全沙盒区存放数据）
            let data_dir = app.path().app_data_dir()
                .expect("Failed to get app data dir for SQLite setup");
            
            // Create data dir if it doesn't exist
            std::fs::create_dir_all(&data_dir).expect("Failed to create app data dir");

            // Initialize connection pool asynchronously
            let db_pool = tauri::async_runtime::block_on(async {
                infrastructure::db::connection::DbPool::init(data_dir)
                    .await
                    .expect("Failed to initialize SQLite database")
            });

            app.manage(db_pool);
            app.manage(port_manager); // Register Global Port Manager State
            app.manage(ChromeLauncher::new()); // Register Universal Chrome Launcher State
            
            // 挂载一个全局活跃的 CDP Client 管理器，这样 MCP Server 等随时可以接管任意 Profile
            let cdp_sessions = std::sync::Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::<String, crate::domain::engine::cdp_client::CdpClient>::new()));
            app.manage(cdp_sessions);

            // 挂载一个全局 Agent 会话历史管理器，支持长程对话 OODA 记忆
            let agent_histories = std::sync::Arc::new(tokio::sync::RwLock::new(std::collections::HashMap::<String, Vec<serde_json::Value>>::new()));
            app.manage(agent_histories);

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                crate::infrastructure::mcp::server::start_server(app_handle).await;
            });

            // 启动系统资源监控
            crate::infrastructure::monitor::start_system_monitor(app.handle().clone());

            // 设置日志转发的 app_handle
            crate::infrastructure::logger::set_app_handle(app.handle().clone());

            log::info!("[Tauri] VeilBrowser Phase 2 Engine & SQLx DB 启动成功");
            println!("✅ [Tauri] VeilBrowser Phase 2 Engine & SQLx DB 启动成功");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            close_splashscreen,
            crate::commands::launch_browser,
            crate::commands::fetch_llm_models,
            agent::api::get_global_setting,
            agent::api::set_global_setting,
            agent::api::start_session,
            agent::api::stop_session,
            agent::api::send_agent_message,
            identities::api::get_identities,
            identities::api::add_identity,
            identities::api::update_identity_cookies,
            identities::api::get_identity,
            identities::api::delete_identity,
            gateway::api::check_proxy_latency,
            crate::commands::skills::get_skills,
            crate::commands::skills::save_skill,
            crate::commands::skills::run_skill,
            crate::commands::contexts::fetch_contexts,
            crate::commands::contexts::fetch_context,
            crate::commands::contexts::add_context,
            crate::commands::contexts::set_context_status,
            crate::commands::contexts::remove_context,
            crate::commands::proxies::fetch_proxies,
            crate::commands::proxies::add_proxy,
            crate::commands::proxies::remove_proxy,
            crate::commands::proxies::set_proxy_status,
            crate::commands::extensions::fetch_extensions,
            crate::commands::extensions::add_extension,
            crate::commands::extensions::remove_extension,
            crate::commands::extensions::set_extension_status,
            crate::commands::artifacts::fetch_artifacts,
            crate::commands::artifacts::add_artifact,
            crate::commands::artifacts::remove_artifact,
            crate::commands::task_runs::fetch_task_runs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
