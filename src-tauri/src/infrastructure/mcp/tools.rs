use serde_json::Value;
use anyhow::{anyhow, Result};
use tauri::{AppHandle, Manager};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::domain::engine::cdp_client::CdpClient;
use super::extractor::SEMANTIC_EXTRACTOR_JS;
use super::models::{ToolContent, CallToolResult, McpTool};

pub struct McpServer {
    app_handle: AppHandle,
    active_profile_id: Arc<Mutex<Option<String>>>,
}

impl McpServer {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { 
            app_handle,
            active_profile_id: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_active_profile(&self, profile_id: String) {
        let mut lock = self.active_profile_id.lock().await;
        *lock = Some(profile_id);
    }

    async fn get_cdp(&self) -> Result<CdpClient> {
        let profile_id_opt = self.active_profile_id.lock().await.clone();
        if let Some(pid) = profile_id_opt {
            let map = self.app_handle.state::<Arc<tokio::sync::RwLock<std::collections::HashMap<String, CdpClient>>>>();
            let reader = map.read().await;
            if let Some(cdp) = reader.get(&pid) {
                return Ok(cdp.clone());
            } else {
                return Err(anyhow!("Profile {} is no longer active", pid));
            }
        }
        Err(anyhow!("No active browser context bound to this MCP session. Please use `launch_context` tool first."))
    }

    /// Captures a screenshot of the active browser context and returns it as a Base64 encoded JPEG string.
    #[allow(dead_code)]
    pub async fn capture_screenshot(&self) -> Result<String> {
        let cdp_client = self.get_cdp().await?;
        cdp_client.capture_screenshot().await
    }

    /// Returns the list of standard MCP tools available to the AI.
    pub fn list_tools(&self) -> Vec<McpTool> {
        vec![
            McpTool {
                name: "browse_url".to_string(),
                description: "Navigate the active browser tab to a specific URL.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "url": { "type": "string", "description": "The fully qualified URL to load. Ensure it starts with http/https/about." }
                    },
                    "required": ["url"]
                }),
            },
            McpTool {
                name: "extract_semantic_dom".to_string(),
                description: "Extracts a lightweight semantic tree of interactive elements from the current page. Each interactive element is assigned a unique `vid` (Veil ID) which you MUST use in `perform_web_action`.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {}
                }),
            },
            McpTool {
                name: "perform_web_action".to_string(),
                description: "Perform an action on the page. Element actions (click, type, hover, select_all) require a `vid`. Global actions (press_enter, press_tab, press_escape, scroll_down, scroll_up, go_back, wait) do NOT require a `vid`.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "action": { "type": "string", "enum": ["click", "type", "hover", "select_all", "press_enter", "press_tab", "press_escape", "scroll_down", "scroll_up", "go_back", "wait"] },
                        "vid": { "type": "integer", "description": "The Veil ID of the target element. Required for click/type/hover/select_all. NOT needed for global actions." },
                        "text": { "type": "string", "description": "The text to type (only for action='type')." },
                        "ms": { "type": "integer", "description": "Milliseconds to wait (only for action='wait', default 2000)." }
                    },
                    "required": ["action"]
                }),
            },
            McpTool {
                name: "inject_skill".to_string(),
                description: "Execute raw JavaScript within the current page context.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "script": { "type": "string", "description": "The JavaScript code to execute." }
                    },
                    "required": ["script"]
                }),
            },
            McpTool {
                name: "dismiss_cookie_banner".to_string(),
                description: "Attempts to automatically find and click common cookie consent/accept buttons on the current page. Call this if you see a cookie banner blocking the view.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {}
                }),
            },
            McpTool {
                name: "manage_tabs".to_string(),
                description: "Manage browser tabs. Use action='list' to see all open tabs, 'new' to open a URL in a new tab (provide url), 'activate' to switch to a tab (provide target_id), 'close' to close a tab (provide target_id).".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "action": { "type": "string", "enum": ["list", "new", "activate", "close"] },
                        "url": { "type": "string", "description": "URL for action='new'." },
                        "target_id": { "type": "string", "description": "Tab target ID for action='activate' or 'close'." }
                    },
                    "required": ["action"]
                }),
            },
            McpTool {
                name: "inject_session_cookies".to_string(),
                description: "Inject cookies into the current browser session to restore a logged-in identity. Pass a JSON array of cookie objects with fields: name, value, domain (required), plus optional path, secure, httpOnly.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "cookies_json": { "type": "string", "description": "JSON array of cookie objects." }
                    },
                    "required": ["cookies_json"]
                }),
            },
            McpTool {
                name: "scroll_human".to_string(),
                description: "Scrolls the page in a human-like pattern simulating real social media browsing behavior. Randomizes scroll distance, pause duration, and occasionally scrolls back to simulate re-reading. Use this instead of the basic scroll action when browsing feeds, timelines, or waterfall layouts.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "rounds": { "type": "integer", "description": "Number of scroll rounds (each round = scroll + random pause). Default: 3.", "default": 3 },
                        "direction": { "type": "string", "enum": ["down", "up"], "description": "Scroll direction.", "default": "down" }
                    }
                }),
            },
            McpTool {
                name: "read_page_text".to_string(),
                description: "Extracts clean, readable text content from the current page - stripping navigation, ads, and boilerplate. Returns the main content (title, body text, visible captions). Use this to understand what the page is ABOUT before generating contextually relevant comments, replies, or summaries.".to_string(),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "max_chars": { "type": "integer", "description": "Maximum characters to return. Default: 3000.", "default": 3000 }
                    }
                }),
            }
            // launch_context 不暴露给 ReAct 循环：
            // Chrome 由 start_session_internal 启动，LLM 不应在 run_agent 中重启浏览器。
            // 该工具保留在 call_tool 路由中，供 Skill 框架在任务开始前声明式配置。
        ]
    }

    /// Executes a tool call from the AI agent.
    pub async fn call_tool(&self, name: &str, arguments: Option<Value>) -> Result<CallToolResult> {
        match name {
            "launch_context" => self.tool_launch_context(arguments).await,
            "browse_url" => self.tool_browse_url(arguments).await,
            "extract_semantic_dom" => self.tool_extract_semantic_dom().await,
            "perform_web_action" => self.tool_perform_web_action(arguments).await,
            "inject_skill" => self.tool_inject_skill(arguments).await,
            "dismiss_cookie_banner" => self.tool_dismiss_cookie_banner().await,
            "manage_tabs" => self.tool_manage_tabs(arguments).await,
            "inject_session_cookies" => self.tool_inject_session_cookies(arguments).await,
            "scroll_human" => self.tool_scroll_human(arguments).await,
            "read_page_text" => self.tool_read_page_text(arguments).await,
            _ => Err(anyhow!("Unknown tool: {}", name))
        }
    }

    async fn tool_launch_context(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let args = arguments.unwrap_or(serde_json::json!({}));

        // profile_id：优先用参数，否则用当前 MCP session 绑定的 profile
        let profile_id = {
            let from_args = args.get("profile_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if !from_args.is_empty() {
                from_args
            } else {
                let lock = self.active_profile_id.lock().await;
                lock.clone().unwrap_or_default()
            }
        };

        if profile_id.is_empty() {
            return Err(anyhow!("profile_id is required (pass it explicitly or call after session has been bound)"));
        }

        // 解析 LaunchOptions 参数
        let headless = args.get("headless").and_then(|v| v.as_bool());
        let viewport_width = args.get("viewport_width").and_then(|v| v.as_u64()).map(|v| v as u32);
        let viewport_height = args.get("viewport_height").and_then(|v| v.as_u64()).map(|v| v as u32);
        let proxy = args.get("proxy").and_then(|v| v.as_str()).map(|s| s.to_string());
        let stealth_level = args.get("stealth_level").and_then(|v| v.as_str()).map(|s| s.to_string());

        match crate::commands::launch_browser(
            "about:blank".to_string(),
            profile_id.clone(),
            self.app_handle.clone(),
            headless,
            viewport_width,
            viewport_height,
            proxy,
            stealth_level.clone(),
        ).await {
            Ok(pid) => {
                // 绑定当前 MCP session 到此 profile
                let mut lock = self.active_profile_id.lock().await;
                *lock = Some(profile_id.clone());

                let headless_str = if headless.unwrap_or(false) { "headless" } else { "headed" };
                let stealth_str = stealth_level.as_deref().unwrap_or("high");
                Ok(CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".into(),
                        text: format!(
                            "Browser launched: profile={}, mode={}, stealth={}, PID={}. Ready for navigation.",
                            profile_id, headless_str, stealth_str, pid
                        )
                    }],
                    is_error: false,
                })
            },
            Err(e) => Err(anyhow!("launch_context failed: {}", e))
        }
    }

    async fn tool_browse_url(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let url = args.get("url")
            .and_then(|u| u.as_str())
            .ok_or_else(|| anyhow!("Missing or invalid 'url' argument"))?;

        if !url.starts_with("http") && !url.starts_with("about:") {
            return Ok(CallToolResult {
                content: vec![ToolContent {
                    content_type: "text".into(),
                    text: "Error: URL must start with http://, https:// or about:".into()
                }],
                is_error: true,
            });
        }

        cdp_client.navigate(url).await?;
        tokio::time::sleep(std::time::Duration::from_millis(2000)).await;

        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: format!("Successfully initiated navigation to {}", url)
            }],
            is_error: false,
        })
    }

    async fn tool_extract_semantic_dom(&self) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let semantic_tree = cdp_client.evaluate_js(SEMANTIC_EXTRACTOR_JS).await?;
        let tree_str = serde_json::to_string_pretty(&semantic_tree).unwrap_or_else(|_| "{}".to_string());

        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: tree_str
            }],
            is_error: false,
        })
    }

    async fn tool_perform_web_action(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let action = args.get("action").and_then(|a| a.as_str()).unwrap_or("");
        
        // === 全局动作 (不需要 vid 指定元素) ===
        match action {
            "scroll_down" => {
                cdp_client.scroll_page("down").await?;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: "Scrolled down successfully".into() }],
                    is_error: false,
                });
            },
            "scroll_up" => {
                cdp_client.scroll_page("up").await?;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: "Scrolled up successfully".into() }],
                    is_error: false,
                });
            },
            "press_enter" => {
                // 模拟回车键：rawKeyDown -> keyUp
                let _ = cdp_client.send_command("Input.dispatchKeyEvent", serde_json::json!({
                    "type": "rawKeyDown",
                    "key": "Enter",
                    "code": "Enter",
                    "windowsVirtualKeyCode": 13,
                    "nativeVirtualKeyCode": 13
                })).await;
                tokio::time::sleep(std::time::Duration::from_millis(50)).await;
                let _ = cdp_client.send_command("Input.dispatchKeyEvent", serde_json::json!({
                    "type": "keyUp",
                    "key": "Enter",
                    "code": "Enter",
                    "windowsVirtualKeyCode": 13,
                    "nativeVirtualKeyCode": 13
                })).await;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: "Pressed Enter key successfully".into() }],
                    is_error: false,
                });
            },
            "press_tab" => {
                let _ = cdp_client.send_command("Input.dispatchKeyEvent", serde_json::json!({
                    "type": "rawKeyDown", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9
                })).await;
                tokio::time::sleep(std::time::Duration::from_millis(30)).await;
                let _ = cdp_client.send_command("Input.dispatchKeyEvent", serde_json::json!({
                    "type": "keyUp", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9
                })).await;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: "Pressed Tab key successfully".into() }],
                    is_error: false,
                });
            },
            "press_escape" => {
                let _ = cdp_client.send_command("Input.dispatchKeyEvent", serde_json::json!({
                    "type": "rawKeyDown", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27
                })).await;
                tokio::time::sleep(std::time::Duration::from_millis(30)).await;
                let _ = cdp_client.send_command("Input.dispatchKeyEvent", serde_json::json!({
                    "type": "keyUp", "key": "Escape", "code": "Escape", "windowsVirtualKeyCode": 27
                })).await;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: "Pressed Escape key successfully".into() }],
                    is_error: false,
                });
            },
            "go_back" => {
                cdp_client.evaluate_js("window.history.back()").await?;
                tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: "Navigated back successfully".into() }],
                    is_error: false,
                });
            },
            "wait" => {
                let ms = args.get("ms").and_then(|m| m.as_u64()).unwrap_or(2000);
                tokio::time::sleep(std::time::Duration::from_millis(ms)).await;
                return Ok(CallToolResult {
                    content: vec![ToolContent { content_type: "text".into(), text: format!("Waited {}ms", ms) }],
                    is_error: false,
                });
            },
            _ => {} // 其他动作需要 vid，继续往下
        }

        // === 需要 vid 的元素级动作 ===
        let vid = args.get("vid").and_then(|v| v.as_i64()).unwrap_or(0);
        if vid == 0 {
            return Err(anyhow!("Invalid or missing 'vid'. Required for element action: {}. Global actions (press_enter, scroll_*, go_back, wait) do not require vid.", action));
        }

        let selector = format!("[data-veil-id='{}']", vid);
        
        match action {
            "click" => {
                let _ = cdp_client.scroll_into_view(&selector).await;
                let root_id = cdp_client.get_document().await?;
                let target_id = cdp_client.query_selector(root_id, &selector).await?;
                cdp_client.click_node(target_id).await?;
            },
            "hover" => {
                let _ = cdp_client.scroll_into_view(&selector).await;
                let root_id = cdp_client.get_document().await?;
                let target_id = cdp_client.query_selector(root_id, &selector).await?;
                cdp_client.hover_node(target_id).await?;
            },
            "type" => {
                let text = args.get("text").and_then(|t| t.as_str()).unwrap_or("");
                let _ = cdp_client.scroll_into_view(&selector).await;
                let root_id = cdp_client.get_document().await?;
                let target_id = cdp_client.query_selector(root_id, &selector).await?;
                cdp_client.focus_node(target_id).await?;
                
                // 清空现有内容后再输入
                let clear_js = format!("document.querySelector('{}').value = '';", selector.replace("'", "\\'"));
                let _ = cdp_client.evaluate_js(&clear_js).await;
                
                cdp_client.type_text(text).await?;
            },
            "select_all" => {
                let _ = cdp_client.scroll_into_view(&selector).await;
                let root_id = cdp_client.get_document().await?;
                let target_id = cdp_client.query_selector(root_id, &selector).await?;
                cdp_client.focus_node(target_id).await?;
                // Ctrl+A / Cmd+A 全选
                let _ = cdp_client.evaluate_js(&format!(
                    "document.querySelector('{}').select()", selector.replace("'", "\\'")
                )).await;
            },
            _ => {
                return Err(anyhow!("Unknown action: {}. Valid actions are: click, type, hover, press_enter, press_tab, press_escape, scroll_down, scroll_up, go_back, wait, select_all.", action));
            }
        }

        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: format!("Successfully executed '{}' on element vid={}", action, vid)
            }],
            is_error: false,
        })
    }

    async fn tool_inject_skill(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let script = args.get("script")
            .and_then(|s| s.as_str())
            .ok_or_else(|| anyhow!("Missing 'script' argument"))?;

        let result = cdp_client.evaluate_js(script).await?;
        let result_str = serde_json::to_string_pretty(&result).unwrap_or_else(|_| "{}".to_string());

        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: format!("Script execution result:\n{}", result_str)
            }],
            is_error: false,
        })
    }

    /// 自动扫描并点击常见的 Cookie 同意横幅按钮 (GDPR 合规横幅)
    async fn tool_dismiss_cookie_banner(&self) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        
        // 常见的 Cookie 横幅 accept 选择器列表 (覆盖主流实现)
        let selectors = [
            // 通用语义选择器
            "button[id*='accept']", "button[id*='cookie']", "button[id*='consent']",
            "button[class*='accept']", "button[class*='cookie']", "button[class*='consent']",
            "a[id*='accept']", "a[class*='accept-all']",
            // 欧洲 GDPR 常见实现
            "#onetrust-accept-btn-handler",      // OneTrust
            ".cc-btn.cc-allow",                  // Cookie Consent
            "#cookie-accept",                    // Generic
            ".cookie-agree",                     // Generic
            "[data-testid='cookie-policy-dialog-accept-button']", // Twitter/X
            ".fc-button-label",                  // Funding Choices (Google)
            ".qc-cmp2-summary-buttons button:last-child", // Quantcast
        ];
        
        let selector_list = selectors.join(",");
        let dismiss_js = format!(
            r#"(function() {{
                const selectors = '{}';
                try {{
                    const btn = document.querySelector(selectors);
                    if (btn) {{
                        btn.click();
                        return 'Clicked: ' + (btn.id || btn.className || btn.innerText).substring(0, 50);
                    }}
                    return 'No cookie banner button found with known selectors.';
                }} catch(e) {{
                    return 'Error: ' + e.message;
                }}
            }})();"#,
            selector_list.replace('\'', "\\'")
        );
        
        let result = cdp_client.evaluate_js(&dismiss_js).await
            .unwrap_or(serde_json::json!("Failed to execute dismiss script"));
        let result_str = result.as_str().unwrap_or("Done").to_string();
        
        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: format!("Cookie banner dismiss result: {}", result_str)
            }],
            is_error: false,
        })
    }

    /// 多 Tab 管理工具 - list/new/activate/close
    async fn tool_manage_tabs(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let action = args.get("action")
            .and_then(|a| a.as_str())
            .unwrap_or("list");

        match action {
            "list" => {
                let tabs = cdp_client.list_tabs().await?;
                let tabs_str = serde_json::to_string_pretty(&tabs)
                    .unwrap_or_else(|_| "[]".to_string());
                Ok(CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".into(),
                        text: format!("Open tabs:\n{}", tabs_str),
                    }],
                    is_error: false,
                })
            }
            "new" => {
                let url = args.get("url").and_then(|u| u.as_str()).unwrap_or("about:blank");
                let target_id = cdp_client.new_tab(url).await?;
                Ok(CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".into(),
                        text: format!("已打开新 Tab，target_id={}", target_id),
                    }],
                    is_error: false,
                })
            }
            "activate" => {
                let target_id = args.get("target_id")
                    .and_then(|t| t.as_str())
                    .ok_or_else(|| anyhow!("activate 需要 target_id 参数"))?;
                cdp_client.activate_tab(target_id).await?;
                Ok(CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".into(),
                        text: format!("已切换到 Tab target_id={}", target_id),
                    }],
                    is_error: false,
                })
            }
            "close" => {
                let target_id = args.get("target_id")
                    .and_then(|t| t.as_str())
                    .ok_or_else(|| anyhow!("close 需要 target_id 参数"))?;
                cdp_client.close_tab(target_id).await?;
                Ok(CallToolResult {
                    content: vec![ToolContent {
                        content_type: "text".into(),
                        text: format!("已关闭 Tab target_id={}", target_id),
                    }],
                    is_error: false,
                })
            }
            _ => Err(anyhow!("未知 action: {}，有效值为 list/new/activate/close", action)),
        }
    }

    /// Cookie 注入工具 - 将 cookie JSON 注入当前浏览器会话
    async fn tool_inject_session_cookies(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let cookies_json = args.get("cookies_json")
            .and_then(|c| c.as_str())
            .ok_or_else(|| anyhow!("缺少 cookies_json 参数"))?;

        let count = cdp_client.inject_cookies(cookies_json).await?;
        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: format!("成功注入 {} 个 Cookie 到当前会话", count),
            }],
            is_error: false,
        })
    }

    /// 拟人化瀑布流滚动
    async fn tool_scroll_human(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let rounds = args.get("rounds")
            .and_then(|r| r.as_u64())
            .unwrap_or(3) as u32;
        let direction = args.get("direction")
            .and_then(|d| d.as_str())
            .unwrap_or("down");

        cdp_client.scroll_human_like(rounds, direction).await?;

        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: format!("已完成 {} 轮拟人化滚动 ({}方向)", rounds, direction),
            }],
            is_error: false,
        })
    }

    /// 提取页面干净正文 (Readability 算法)
    async fn tool_read_page_text(&self, arguments: Option<Value>) -> Result<CallToolResult> {
        let cdp_client = self.get_cdp().await?;
        let args = arguments.unwrap_or(serde_json::json!({}));
        let max_chars = args.get("max_chars")
            .and_then(|m| m.as_u64())
            .unwrap_or(3000) as usize;

        // 注入 Readability 风格的正文提取脚本
        // 优先提取 og:title、article、main、.content 等语义标签
        let extract_js = r#"(function() {
            // 优先读取 meta 标题和 og 描述
            const title = document.title || 
                (document.querySelector('meta[property="og:title"]') || {}).content || '';
            const desc = (document.querySelector('meta[property="og:description"]') || 
                          document.querySelector('meta[name="description"]') || {}).content || '';
            
            // 语义内容容器优先级（从高到低）
            const candidates = [
                'article', 'main', '[role="main"]',
                '.article-body', '.post-content', '.entry-content', '#content',
                '.content', '.main-content', '.note-content',   // 小红书
                '[data-testid="tweetText"]',                    // Twitter
                '.weibo-text', '.feed-item__text__content',     // 微博
                '.css-901oao',                                  // Twitter span
            ];
            
            let mainText = '';
            for (const sel of candidates) {
                const el = document.querySelector(sel);
                if (el && el.innerText && el.innerText.trim().length > 50) {
                    mainText = el.innerText.trim();
                    break;
                }
            }
            
            // 回退：取 body 文本，过滤掉导航菜单
            if (!mainText) {
                const body = document.body.cloneNode(true);
                ['nav', 'header', 'footer', 'aside', 'script', 'style', '.ad', '#ad'].forEach(sel => {
                    body.querySelectorAll(sel).forEach(el => el.remove());
                });
                mainText = body.innerText.trim();
            }
            
            return JSON.stringify({
                url: location.href,
                title: title,
                description: desc,
                text: mainText
            });
        })();"#;

        let result = cdp_client.evaluate_js(extract_js).await
            .unwrap_or(serde_json::json!("{}"));

        // 解析结果 JSON
        let text_str = if let Some(raw_str) = result.as_str() {
            let parsed: serde_json::Value = serde_json::from_str(raw_str)
                .unwrap_or(serde_json::json!({}));
            let title = parsed.get("title").and_then(|t| t.as_str()).unwrap_or("");
            let text = parsed.get("text").and_then(|t| t.as_str()).unwrap_or("");
            let url = parsed.get("url").and_then(|u| u.as_str()).unwrap_or("");
            let combined = format!("# {}\n\nURL: {}\n\n{}", title, url, text);
            if combined.chars().count() > max_chars {
                format!("{}...(截断)", combined.chars().take(max_chars).collect::<String>())
            } else {
                combined
            }
        } else {
            "无法提取页面正文".to_string()
        };

        Ok(CallToolResult {
            content: vec![ToolContent {
                content_type: "text".into(),
                text: text_str,
            }],
            is_error: false,
        })
    }
}
