use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use rand::Rng;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, oneshot};
use tokio::time::timeout;
use futures_util::{stream::StreamExt, SinkExt};
use anyhow::{Result, Context, anyhow};
use serde::{Deserialize, Serialize};
use crate::domain::skills::executor::CdpClientIntermediary;

/// 描述一个 JSON-RPC 2.0 的通用请求体
#[derive(Serialize)]
pub struct RpcRequest<'a> {
    pub id: u64,
    pub method: &'a str,
    pub params: serde_json::Value,
}

/// 描述一个 JSON-RPC 2.0 的响应体
#[derive(Deserialize, Debug)]
#[serde(untagged)]
pub enum RpcMessage {
    /// 标准响应 (带 id)
    Response {
        id: u64,
        #[serde(default)]
        result: Option<serde_json::Value>,
        #[serde(default)]
        error: Option<serde_json::Value>,
    },
    /// 服务端推送的事件 (无 id, 有 method)
    Event {
        method: String,
        #[serde(default)]
        params: Option<serde_json::Value>,
    },
}

/// 内部通道的消息结构，用于将收到的 Response 路由回发出 Request 的 await 处
type Responder = oneshot::Sender<Result<serde_json::Value>>;

/// 决定会话隐身后指纹特征的配置体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StealthProfile {
    pub hardware_concurrency: u32,
    pub device_memory: u32,
    pub webgl_vendor: String,
    pub webgl_renderer: String,
    pub canvas_noise_seed: f64,
    pub support_commercial_codecs: bool,
}

impl StealthProfile {
    pub fn new_deterministic(id: &str, os: &str) -> Self {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        id.hash(&mut hasher);
        let hash_val = hasher.finish();

        let canvas_noise_seed = ((hash_val % 1000000) as f64) / 1000000.0 + 0.0001;
        let hw_concurrency = if hash_val % 2 == 0 { 8 } else { 16 };
        let device_memory = if hash_val % 3 == 0 { 8 } else { 16 };

        let is_apple = os.to_lowercase().contains("mac") || os.to_lowercase().contains("darwin") || os.to_lowercase().contains("apple");
        let (webgl_vendor, webgl_renderer) = if is_apple {
            let renderers = ["Apple M1", "Apple M1 Pro", "Apple M1 Max", "Apple M2", "Apple M3", "Apple M3 Max"];
            ("Apple", renderers[(hash_val as usize) % renderers.len()])
        } else {
            let renderers = [
                "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)", 
                "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)",
                "ANGLE (Intel Inc., Intel Iris Pro OpenGL Engine, OpenGL 4.1)"
            ];
            ("Google Inc. (NVIDIA)", renderers[(hash_val as usize) % renderers.len()])
        };

        Self {
            hardware_concurrency: hw_concurrency,
            device_memory: device_memory,
            webgl_vendor: webgl_vendor.to_string(),
            webgl_renderer: webgl_renderer.to_string(),
            canvas_noise_seed,
            support_commercial_codecs: true,
        }
    }
}

/// 核心的 CDP 客户端。
/// 这是一个廉价的可克隆结构体 (内部封装了 Arc)，可以跨线程传递丢给 Executor。
#[derive(Clone)]
pub struct CdpClient {
    /// 递增的请求ID
    next_id: Arc<Mutex<u64>>,
    /// 发送消息到后台 WebSocket 写半部的通道
    tx_channel: mpsc::Sender<(String, Responder)>,
    #[allow(dead_code)]
    app_handle: Option<AppHandle>,
    pub port: u16,
}

impl CdpClient {
    /// 连接到指定的 WebSocket URL (例如 `ws://127.0.0.1:9222/devtools/browser`)
    /// 建立连接后会自动产生一个后台异步任务 (Task) 维护 ws 收发循环。
    pub async fn connect(ws_url: &str, app_handle: Option<AppHandle>, mission_id: Option<String>) -> Result<Self> {
        log::info!("[CDP Client] Connecting to {}", ws_url);
        let (ws_stream, _) = tokio_tungstenite::connect_async(ws_url).await
            .with_context(|| format!("Failed to connect to CDP WebSocket at {}", ws_url))?;
            
        let (mut write_half, mut read_half) = ws_stream.split();
        
        // mpsc 用于承接来自多个业务线程的 "发信" 需求
        let (tx, mut rx) = mpsc::channel::<(String, Responder)>(100);
        
        // 存储等待响应的字典 (Key = 请求ID, Value = oneshot发送端)
        let pending_requests: Arc<Mutex<HashMap<u64, Responder>>> = Arc::new(Mutex::new(HashMap::new()));
        
        let pending_reqs_for_read = pending_requests.clone();
        
        let app_handle_clone = app_handle.clone();
        let mission_id_clone = mission_id.clone();
        // 启动后台事件循环 (全双工)
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    // 情况 A: 业务层要求发送一条新的请求
                    Some((msg_str, responder)) = rx.recv() => {
                        // 提取这段消息里的 id 存入 pending 字典
                        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&msg_str) {
                            if let Some(id) = v.get("id").and_then(|i| i.as_u64()) {
                                pending_requests.lock().unwrap().insert(id, responder);
                            }
                        }
                        
                        // 发送到真实 WebSocket Socket
                        if let Err(e) = write_half.send(tokio_tungstenite::tungstenite::Message::Text(msg_str.into())).await {
                            log::error!("[CDP] Failed to send over WS: {}", e);
                            break;
                        }
                    }
                    
                    // 情况 B: 从真实 WebSocket 收到消息
                    Some(Ok(msg)) = read_half.next() => {
                        if let tokio_tungstenite::tungstenite::Message::Text(text) = msg {
                            // 尝试解析为 JSON-RPC 消息
                            if let Ok(rpc_msg) = serde_json::from_str::<RpcMessage>(&text) {
                                match rpc_msg {
                                    RpcMessage::Response { id, result, error } => {
                                        // 找到对应的调用方唤醒点
                                        if let Some(responder) = pending_reqs_for_read.lock().unwrap().remove(&id) {
                                            if let Some(err_val) = error {
                                                let _ = responder.send(Err(anyhow!("CDP Error: {}", err_val)));
                                            } else {
                                                let res_val = result.unwrap_or(serde_json::Value::Null);
                                                let _ = responder.send(Ok(res_val));
                                            }
                                        }
                                    },
                                    RpcMessage::Event { method, params } => {
                                        // ===================================================
                                        // 🔧 弹窗自动处理器 (Popup Auto-Dismiss)
                                        // 当浏览器弹出 alert/confirm/prompt 对话框时，
                                        // 这些原生弹窗会冻结 CDP 命令队列，导致 OODA 卡死。
                                        // 这里自动接受并关闭，不影响主流程。
                                        // ===================================================
                                        if method == "Page.javascriptDialogOpening" {
                                            let dialog_type = params.as_ref()
                                                .and_then(|p| p.get("type"))
                                                .and_then(|t| t.as_str())
                                                .unwrap_or("alert");
                                            log::warn!("[CDP] 检测到原生弹窗: {} - 自动 dismiss", dialog_type);
                                            let dismiss_msg = serde_json::json!({
                                                "id": 9999998_u64,
                                                "method": "Page.handleJavaScriptDialog",
                                                "params": { "accept": true, "promptText": "" }
                                            }).to_string();
                                            let _ = write_half.send(
                                                tokio_tungstenite::tungstenite::Message::Text(dismiss_msg.into())
                                            ).await;
                                        }
                                        
                                        // 转发日志或 Screencast 到前端
                                        if let Some(app) = &app_handle_clone {
                                            if method == "Page.screencastFrame" {
                                                if let Some(p) = &params {
                                                    let _ = app.emit("screencast-frame", serde_json::json!({
                                                        "data": p.get("data"),
                                                        "sessionId": p.get("sessionId"),
                                                        "missionId": mission_id_clone
                                                    }));
                                                    
                                                    // 必须回复 ACK，否则 Chrome 不会发送下一帧
                                                    if let Some(sid) = p.get("sessionId").and_then(|s| s.as_i64()) {
                                                        let ack_id = 999990 + sid as u64; 
                                                        let ack_msg = serde_json::json!({
                                                            "id": ack_id,
                                                            "method": "Page.screencastFrameAck",
                                                            "params": { "sessionId": sid }
                                                        }).to_string();
                                                        let _ = write_half.send(tokio_tungstenite::tungstenite::Message::Text(ack_msg.into())).await;
                                                    }
                                                }
                                            } else {
                                                let _ = app.emit("cdp-log", serde_json::json!({
                                                    "method": method,
                                                    "params": params
                                                }));
                                            }
                                        }
                                    }
                                }
                            } else {
                                log::warn!("[CDP] Unparseable message: {}", text);
                            }
                        }
                    }
                }
            }
            log::warn!("[CDP] WebSocket Event Loop Terminated.");
        });

        let port = reqwest::Url::parse(ws_url)
            .ok()
            .and_then(|u| u.port())
            .unwrap_or(9222);

        let client = Self {
            next_id: Arc::new(Mutex::new(1)),
            tx_channel: tx,
            app_handle,
            port,
        };

        Ok(client)
    }

    /// 自动寻找并连接到第一个可用的页面 (Page) Target
    pub async fn connect_best_tab(port: u16, app_handle: Option<AppHandle>, mission_id: Option<String>) -> Result<Self> {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(5))
            .build()?;
            
        let list_url = format!("http://127.0.0.1:{}/json/list", port);
        
        // 轮询几次直到页面出现
        for i in 0..10 {
            if let Ok(resp) = client.get(&list_url).send().await {
                if let Ok(targets) = resp.json::<serde_json::Value>().await {
                    if let Some(targets_arr) = targets.as_array() {
                        // 优先找 type="page" 的
                        for target in targets_arr {
                            if target.get("type").and_then(|t| t.as_str()) == Some("page") {
                                if let Some(ws_url) = target.get("webSocketDebuggerUrl").and_then(|u| u.as_str()) {
                                    log::info!("[CDP] Found page target: {}", ws_url);
                                    return Self::connect(ws_url, app_handle, mission_id).await;
                                }
                            }
                        }
                    }
                }
            }
            log::info!("[CDP] Waiting for page target (attempt {})...", i + 1);
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
        
        Err(anyhow!("Failed to find an active page target on port {}", port))
    }

    /// 0. 在开启任何真正的领航前，给所有新弹出的页面注射防御体系
    pub async fn init_stealth(&self, profile: &StealthProfile) -> Result<()> {
        log::info!("[CDP] Initializing L4 Stealth Mechanisms");
        
        self.send_command("Page.enable", serde_json::json!({})).await
            .context("Failed to enable Page domain")?;
        
        // 启用弹窗事件通知 (让事件循环里的 auto-dismiss 生效)
        // 这一步是必须的，否则 Chrome 不会推送 Page.javascriptDialogOpening 事件
        self.send_command("Page.setJavaScriptEnabled", serde_json::json!({ "enabled": true })).await.ok();
        // 通知 Chrome 在遇到 dialog 时暂停并发送事件 (而不是立即显示)
        self.send_command("Page.enable", serde_json::json!({})).await.ok();

        // 构造当前 Session 的指纹配置上下文
        let profile_injector_js = format!(
            r#"
            Object.defineProperty(window, '__veil_profile', {{
                value: {{
                    hardware_concurrency: {},
                    device_memory: {},
                    webgl_vendor: "{}",
                    webgl_renderer: "{}",
                    canvas_noise_seed: {},
                    support_commercial_codecs: {}
                }},
                writable: false,
                configurable: false
            }});
            "#,
            profile.hardware_concurrency,
            profile.device_memory,
            profile.webgl_vendor,
            profile.webgl_renderer,
            profile.canvas_noise_seed,
            profile.support_commercial_codecs
        );
        self.send_command("Page.addScriptToEvaluateOnNewDocument", serde_json::json!({
            "source": profile_injector_js
        })).await?;

        // 读取各个专类的 Stealth 武器模块
        let payloads = vec![
            ("Hardware & Webdriver Spoof", include_str!("stealth/hardware.js")),
            ("WebGL Fingerprint Override", include_str!("stealth/webgl.js")),
            ("Canvas Noise Injection", include_str!("stealth/canvas.js")),
            ("Codec Compatibility Patch", include_str!("stealth/codecs.js")),
        ];

        for (name, script) in payloads {
            log::info!("[CDP] Injecting payload: {}", name);
            self.send_command("Page.addScriptToEvaluateOnNewDocument", serde_json::json!({
                "source": script
            })).await.context(format!("Failed to inject {}", name))?;
        }
        
        Ok(())
    }

    /// 发送一个通用的底层调用，等待超时默认 5 秒
    pub async fn send_command(&self, method: &str, params: serde_json::Value) -> Result<serde_json::Value> {
        let req_id = {
            let mut id = self.next_id.lock().unwrap();
            let current = *id;
            *id += 1;
            current
        };

        let req = RpcRequest {
            id: req_id,
            method,
            params,
        };
        
        let json_str = serde_json::to_string(&req)?;
        let (resp_tx, resp_rx) = oneshot::channel();
        
        self.tx_channel.send((json_str, resp_tx)).await
            .map_err(|_| anyhow!("CDP Background task died"))?;
            
        // 等待响应，设置 5 秒硬超时防止假死
        let response = timeout(Duration::from_secs(5), resp_rx).await
            .context("Timeout waiting for CDP response")?
            .context("Responder channel dropped")??;
            
        Ok(response)
    }

    /// 1. 导航到指定 URL
    pub async fn navigate(&self, url: &str) -> Result<()> {
        let params = serde_json::json!({ "url": url });
        self.send_command("Page.navigate", params).await?;
        Ok(())
    }

    /// 截取当前页面内容并返回 Base64 字符串
    #[allow(dead_code)]
    pub async fn capture_screenshot(&self) -> Result<String> {
        let params = serde_json::json!({
            "format": "jpeg",
            "quality": 80
        });
        let resp = self.send_command("Page.captureScreenshot", params).await?;
        
        let data = resp.get("data")
            .and_then(|d| d.as_str())
            .ok_or_else(|| anyhow!("Failed to parse screenshot data from CDP response"))?;
            
        Ok(data.to_string())
    }

    /// 2. 获取当前页面的根 DOM NodeId
    pub async fn get_document(&self) -> Result<i64> {
        let params = serde_json::json!({ "depth": 0 });
        let resp = self.send_command("DOM.getDocument", params).await?;
        
        let root_id = resp.get("root")
            .and_then(|r| r.get("nodeId"))
            .and_then(|n| n.as_i64())
            .ok_or_else(|| anyhow!("Failed to parse root nodeId from DOM.getDocument"))?;
            
        Ok(root_id)
    }

    /// 3. 在指定节点下根据 Selector 查询目标 nodeId
    pub async fn query_selector(&self, node_id: i64, selector: &str) -> Result<i64> {
        let params = serde_json::json!({
            "nodeId": node_id,
            "selector": selector
        });
        let resp = self.send_command("DOM.querySelector", params).await?;
        
        let target_id = resp.get("nodeId")
            .and_then(|n| n.as_i64());
            
        if let Some(id) = target_id {
            if id > 0 {
                return Ok(id);
            }
        }
        
        Err(anyhow!("Selector '{}' not found", selector))
    }

    /// 4. 将元素滚动到视口并点击 (带有高斯偏移与拟人的贝塞尔曲线轨迹)
    pub async fn click_node(&self, node_id: i64) -> Result<()> {
        use crate::domain::engine::physics_input::{PhysicsInput, Point};

        // 先获取元素的盒模型位置
        let params = serde_json::json!({ "nodeId": node_id });
        let resp = self.send_command("DOM.getBoxModel", params).await
            .context("Failed to getBoxModel to click")?;
            
        let content_quad = resp.get("model")
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_array())
            .filter(|a| a.len() == 8)
            .ok_or_else(|| anyhow!("Invalid BoxModel content quad"))?;
            
        let left = content_quad[0].as_f64().unwrap_or(0.0);
        let top = content_quad[1].as_f64().unwrap_or(0.0);
        let right = content_quad[2].as_f64().unwrap_or(10.0);
        let bottom = content_quad[5].as_f64().unwrap_or(10.0);
        
        let width = (right - left).abs().max(1.0);
        let height = (bottom - top).abs().max(1.0);
        
        // 生成 Box 内 20%~80% 的高斯随机落点
        let offset_x = width * rand::thread_rng().gen_range(0.2..0.8);
        let offset_y = height * rand::thread_rng().gen_range(0.2..0.8);
        
        let target_x = left + offset_x;
        let target_y = top + offset_y;

        // 假定鼠标当前在屏幕的另一个随机位置 (若未追踪上次位置)
        // 从当前视口外围选一个点作为起始
        let start_x = target_x + rand::thread_rng().gen_range(-400.0..400.0);
        let start_y = target_y + rand::thread_rng().gen_range(-300.0..300.0);
        
        let start_point = Point { x: start_x, y: start_y };
        let end_point = Point { x: target_x, y: target_y };
        let steps = rand::thread_rng().gen_range(15..25);
        
        // 使用 Physics Engine 生成贝塞尔物理轨迹
        let trajectory = PhysicsInput::generate_mouse_trajectory(start_point, end_point, steps);

        for frame in trajectory {
            self.send_command("Input.dispatchMouseEvent", serde_json::json!({
                "type": "mouseMoved",
                "x": frame.point.x,
                "y": frame.point.y
            })).await?;
            
            tokio::time::sleep(Duration::from_millis(frame.delay_ms)).await;
        }

        // 稍微抖动停顿 (悬停瞄准)
        let delay_before_down = rand::thread_rng().gen_range(50..120);
        tokio::time::sleep(Duration::from_millis(delay_before_down)).await;

        // Mouse Down
        self.send_command("Input.dispatchMouseEvent", serde_json::json!({
            "type": "mousePressed",
            "x": target_x,
            "y": target_y,
            "button": "left",
            "clickCount": 1
        })).await?;

        // 按下的迟滞 (标准的 Fitts 模拟按下时间)
        let delay_pressed = rand::thread_rng().gen_range(30..80);
        tokio::time::sleep(Duration::from_millis(delay_pressed)).await;

        // Mouse Up
        // 忽略这里的 await 错误：因为如果点击触发了页面跳转（Navigation），
        // 浏览器可能会立刻销毁当前上下文，导致这条 CDP 命令收不到 Response 从而 Timeout。
        let _ = self.send_command("Input.dispatchMouseEvent", serde_json::json!({
            "type": "mouseReleased",
            "x": target_x,
            "y": target_y,
            "button": "left",
            "clickCount": 1
        })).await;

        Ok(())
    }

    /// 5. 聚焦到指定节点并输入文本
    pub async fn focus_node(&self, node_id: i64) -> Result<()> {
        let params = serde_json::json!({ "nodeId": node_id });
        self.send_command("DOM.focus", params).await?;
        Ok(())
    }

    /// 6. 模拟人类真实打字 (带有重力权重与类泊松分布)
    pub async fn type_text(&self, text: &str) -> Result<()> {
        use crate::domain::engine::physics_input::PhysicsInput;
        let delays = PhysicsInput::generate_typing_delays(text);
        
        for (i, ch) in text.chars().enumerate() {
            let params = serde_json::json!({
                "type": "char",
                "text": ch.to_string()
            });
            self.send_command("Input.dispatchKeyEvent", params).await?;
            
            if i < text.len() - 1 {
                tokio::time::sleep(Duration::from_millis(delays[i])).await;
            }
        }
        Ok(())
    }

    /// 7. 在当前上下文中执行任意 JavaScript 代码
    pub async fn evaluate_js(&self, expression: &str) -> Result<serde_json::Value> {
        let params = serde_json::json!({
            "expression": expression,
            "returnByValue": true,
            "awaitPromise": true
        });
        let resp = self.send_command("Runtime.evaluate", params).await?;
        
        // 提取异常情况
        if let Some(exception) = resp.get("exceptionDetails") {
            return Err(anyhow::anyhow!("JS Execution Error: {:?}", exception));
        }
        
        let value = resp.get("result")
            .and_then(|r| r.get("value"))
            .cloned()
            .unwrap_or(serde_json::Value::Null);
            
        Ok(value)
    }

    /// 8. 将元素滚动到视口中央
    pub async fn scroll_into_view(&self, selector: &str) -> Result<()> {
        let expression = format!(
            "document.querySelector('{}').scrollIntoView({{block: 'center', inline: 'center'}})",
            selector.replace("'", "\\'") // 简单转义防止注入报错
        );
        self.evaluate_js(&expression).await?;
        tokio::time::sleep(Duration::from_millis(100)).await; // 等待平滑滚动完成
        Ok(())
    }

    /// 9. 滚动整个页面 (模拟鼠标滚轮或触控板)
    pub async fn scroll_page(&self, direction: &str) -> Result<()> {
        let multiplier = if direction == "down" { 0.8 } else { -0.8 };
        let expression = format!("window.scrollBy({{ top: window.innerHeight * {}, behavior: 'smooth' }});", multiplier);
        self.evaluate_js(&expression).await?;
        tokio::time::sleep(Duration::from_millis(800)).await; // 等待滚动动画完成
        Ok(())
    }

    /// 10. 将鼠标悬停到指定节点 (复用物理引擎轨迹，但不点击)
    pub async fn hover_node(&self, node_id: i64) -> Result<()> {
        use crate::domain::engine::physics_input::{PhysicsInput, Point};

        let params = serde_json::json!({ "nodeId": node_id });
        let resp = self.send_command("DOM.getBoxModel", params).await
            .context("Failed to getBoxModel to hover")?;
            
        let content_quad = resp.get("model")
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_array())
            .filter(|a| a.len() == 8)
            .ok_or_else(|| anyhow!("Invalid BoxModel content quad"))?;
            
        let left = content_quad[0].as_f64().unwrap_or(0.0);
        let top = content_quad[1].as_f64().unwrap_or(0.0);
        let right = content_quad[2].as_f64().unwrap_or(10.0);
        let bottom = content_quad[5].as_f64().unwrap_or(10.0);
        
        let width = (right - left).abs().max(1.0);
        let height = (bottom - top).abs().max(1.0);
        
        let offset_x = width * rand::thread_rng().gen_range(0.2..0.8);
        let offset_y = height * rand::thread_rng().gen_range(0.2..0.8);
        
        let target_x = left + offset_x;
        let target_y = top + offset_y;

        let start_x = target_x + rand::thread_rng().gen_range(-400.0..400.0);
        let start_y = target_y + rand::thread_rng().gen_range(-300.0..300.0);
        
        let start_point = Point { x: start_x, y: start_y };
        let end_point = Point { x: target_x, y: target_y };
        let steps = rand::thread_rng().gen_range(15..25);
        
        let trajectory = PhysicsInput::generate_mouse_trajectory(start_point, end_point, steps);

        for frame in trajectory {
            self.send_command("Input.dispatchMouseEvent", serde_json::json!({
                "type": "mouseMoved",
                "x": frame.point.x,
                "y": frame.point.y
            })).await?;
            
            tokio::time::sleep(Duration::from_millis(frame.delay_ms)).await;
        }
        
        // 悬停一会儿以触发可能是 hover 的 UI
        let delay_hover = rand::thread_rng().gen_range(300..600);
        tokio::time::sleep(Duration::from_millis(delay_hover)).await;

        Ok(())
    }

    // ====================================================================
    // 🌊 拟人化滚动 (Human-like Scroll)
    // 模拟真实人类在瀑布流/长页面中的非对称阅读行为
    // ====================================================================

    /// 16. 拟人化滚动 - 专为瀑布流/社交媒体长页面设计
    ///
    /// # 参数
    /// - `rounds`: 滚动轮次 (每轮含方向、幅度、停顿的随机化)
    /// - `direction`: "down" (向下浏览) / "up" (向上返回)
    pub async fn scroll_human_like(&self, rounds: u32, direction: &str) -> Result<()> {
        let is_down = direction != "up";

        for round in 0..rounds {
            // ── 1. 随机滚动幅度：0.2 ~ 0.9 屏幕高度
            let fraction: f64 = rand::thread_rng().gen_range(0.20..0.90);
            let direction_sign = if is_down { 1.0 } else { -1.0 };
            let scroll_expr = format!(
                "window.scrollBy({{ top: window.innerHeight * {} * {}, behavior: 'smooth' }});",
                fraction, direction_sign
            );
            self.evaluate_js(&scroll_expr).await.ok();

            // ── 2. 等待平滑滚动完成
            let sleep_ms = rand::thread_rng().gen_range(300..700);
            tokio::time::sleep(Duration::from_millis(sleep_ms)).await;

            // ── 3. 随机停顿：模拟人类"阅读"当前视口内容
            let reading_pause = {
                let mut rng = rand::thread_rng();
                if rng.gen_bool(0.3) {
                    rng.gen_range(2000..4000)
                } else {
                    rng.gen_range(500..1500)
                }
            };
            tokio::time::sleep(Duration::from_millis(reading_pause)).await;

            // ── 4. 10% 概率触发"回看"行为：向反方向滚一点
            if rand::thread_rng().gen_bool(0.10) {
                log::debug!("[HumanScroll] 触发回看行为 (round {})", round + 1);
                let back_fraction: f64 = rand::thread_rng().gen_range(0.05..0.25);
                let back_expr = format!(
                    "window.scrollBy({{ top: window.innerHeight * {} * {}, behavior: 'smooth' }});",
                    back_fraction, -direction_sign
                );
                self.evaluate_js(&back_expr).await.ok();
                let back_sleep = rand::thread_rng().gen_range(400..900);
                tokio::time::sleep(Duration::from_millis(back_sleep)).await;
            }

            // ── 5. 随机微小鼠标移动（仅移动，不点击）
            let (mouse_x, mouse_y) = {
                let mut rng = rand::thread_rng();
                (rng.gen_range(200.0..1400.0), rng.gen_range(150.0..750.0))
            };
            self.send_command("Input.dispatchMouseEvent", serde_json::json!({
                "type": "mouseMoved",
                "x": mouse_x,
                "y": mouse_y
            })).await.ok();
        }

        Ok(())
    }


    // 通过 Chrome DevTools REST API 管理多个页面 Target
    // ====================================================================

    /// 11. 列出当前所有打开的 Tab
    pub async fn list_tabs(&self) -> Result<Vec<serde_json::Value>> {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()?;
        let resp = client.get(format!("http://127.0.0.1:{}/json/list", self.port)).send().await?;
        let targets: serde_json::Value = resp.json().await?;
        let tabs = targets.as_array()
            .map(|arr| arr.iter()
                .filter(|t| t.get("type").and_then(|v| v.as_str()) == Some("page"))
                .map(|t| serde_json::json!({
                    "id":    t.get("id").and_then(|v| v.as_str()).unwrap_or(""),
                    "title": t.get("title").and_then(|v| v.as_str()).unwrap_or(""),
                    "url":   t.get("url").and_then(|v| v.as_str()).unwrap_or(""),
                }))
                .collect::<Vec<_>>()
            )
            .unwrap_or_default();
        Ok(tabs)
    }

    /// 12. 打开新 Tab，返回 target_id
    /// 使用 CDP WebSocket 命令 Target.createTarget（比 REST API /json/new 更可靠）
    pub async fn new_tab(&self, url: &str) -> Result<String> {
        let navigate_url = if url.is_empty() { "about:blank" } else { url };
        let result = self.send_command("Target.createTarget", serde_json::json!({
            "url": navigate_url
        })).await.context("Target.createTarget 失败")?;

        let target_id = result.get("targetId")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("Target.createTarget 响应中缺少 targetId: {:?}", result))?
            .to_string();

        log::info!("[CDP] 打开了新 Tab, url={}, target_id={}", navigate_url, target_id);
        Ok(target_id)
    }

    /// 13. 激活（切换到）指定的 Tab
    pub async fn activate_tab(&self, target_id: &str) -> Result<()> {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()?;
        client.get(&format!("http://127.0.0.1:{}/json/activate/{}", self.port, target_id))
            .send().await?;
        tokio::time::sleep(Duration::from_millis(300)).await;
        Ok(())
    }

    /// 14. 关闭指定的 Tab
    pub async fn close_tab(&self, target_id: &str) -> Result<()> {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(3))
            .build()?;
        client.get(&format!("http://127.0.0.1:{}/json/close/{}", self.port, target_id))
            .send().await?;
        Ok(())
    }

    // ====================================================================
    // 🔐 凭证注入 (Cookie & Identity Injection)
    // ====================================================================

    /// 15. 注入 Cookies 到当前会话 (用于从 Identity 金库恢复登录态)
    /// cookies_json 格式：JSON 数组，每项 { name, value, domain, path?, secure?, httpOnly? }
    pub async fn inject_cookies(&self, cookies_json: &str) -> Result<usize> {
        let cookies: serde_json::Value = serde_json::from_str(cookies_json)
            .map_err(|e| anyhow!("Cookie JSON 格式错误: {}", e))?;
        let cookies_arr = cookies.as_array()
            .ok_or_else(|| anyhow!("Cookies 必须是 JSON 数组"))?;
        // 启用 Network 域
        self.send_command("Network.enable", serde_json::json!({})).await.ok();
        let count = cookies_arr.len();
        self.send_command("Network.setCookies", serde_json::json!({ "cookies": cookies_arr })).await
            .context("Network.setCookies 失败")?;
        log::info!("[CDP] 成功注入 {} 个 Cookie", count);
        Ok(count)
    }
}

#[async_trait::async_trait]
impl CdpClientIntermediary for CdpClient {
    async fn navigate(&self, url: &str) -> std::result::Result<(), anyhow::Error> {
        self.navigate(url).await
    }
    
    async fn click_selector(&self, selector: &str) -> std::result::Result<(), anyhow::Error> {
        let _ = self.scroll_into_view(selector).await; // 尽力而为尝试先滚动过去
        let root_id = self.get_document().await?;
        let target_id = self.query_selector(root_id, selector).await?;
        self.click_node(target_id).await
    }
    
    async fn type_text(&self, selector: &str, text: &str) -> std::result::Result<(), anyhow::Error> {
        let _ = self.scroll_into_view(selector).await;
        let root_id = self.get_document().await?;
        let target_id = self.query_selector(root_id, selector).await?;
        self.focus_node(target_id).await?;
        self.type_text(text).await
    }
    
    async fn wait_for_selector(&self, selector: &str, timeout_ms: u64) -> std::result::Result<(), anyhow::Error> {
        let start = std::time::Instant::now();
        let timeout = Duration::from_millis(timeout_ms);
        
        while start.elapsed() < timeout {
            if let Ok(root_id) = self.get_document().await {
                if self.query_selector(root_id, selector).await.is_ok() {
                    return Ok(());
                }
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
        
        Err(anyhow!("Timeout waiting for selector: {}", selector))
    }
    
    async fn simulate_keypress(&self, key: &str) -> std::result::Result<(), anyhow::Error> {
        let params = serde_json::json!({
            "type": "rawKeyDown",
            "key": key
        });
        self.send_command("Input.dispatchKeyEvent", params.clone()).await?;
        
        let params_up = serde_json::json!({
            "type": "keyUp",
            "key": key
        });
        self.send_command("Input.dispatchKeyEvent", params_up).await?;
        Ok(())
    }
    
    async fn wait_time(&self, ms: u64) -> std::result::Result<(), anyhow::Error> {
        tokio::time::sleep(Duration::from_millis(ms)).await;
        Ok(())
    }
}
