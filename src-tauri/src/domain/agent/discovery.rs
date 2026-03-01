use std::sync::Arc;
use std::time::{Duration, Instant};
use anyhow::{Result, anyhow, Context};
use serde_json::Value;

use crate::infrastructure::mcp::tools::McpServer;

pub struct DiscoveryService {
    mcp_server: Arc<McpServer>,
    llm_api_key: String,
    llm_base_url: String,
    llm_model: String,
}

/// Agent 循环的结束原因
#[derive(Debug)]
pub enum AgentStopReason {
    /// LLM 主动完成：不再调用工具，返回了自然语言文本
    Completed(String),
    /// 超出最大 Tool 调用次数
    MaxToolCallsReached(u32),
    /// 超出最大运行时长
    Timeout,
    /// 连续错误超限
    ConsecutiveErrors(u32),
}

impl std::fmt::Display for AgentStopReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentStopReason::Completed(msg) => write!(f, "✅ 任务完成: {}", msg),
            AgentStopReason::MaxToolCallsReached(n) => write!(f, "⏹ 达到最大工具调用次数 ({})", n),
            AgentStopReason::Timeout => write!(f, "⏱ 任务超时"),
            AgentStopReason::ConsecutiveErrors(n) => write!(f, "❌ 连续 {} 次错误，已终止", n),
        }
    }
}

impl DiscoveryService {
    pub fn new(
        mcp_server: Arc<McpServer>,
        llm_api_key: String,
        llm_base_url: String,
        llm_model: String,
    ) -> Self {
        Self {
            mcp_server,
            llm_api_key,
            llm_base_url,
            llm_model,
        }
    }




    /// 🧠 真正的 LLM 驱动 ReAct Agent 循环
    ///
    /// 与旧的固定步骤 OODA 不同，这里完全由 LLM 控制：
    /// - LLM 调用 tool → 执行 tool → 结果回注 history → 再次请求 LLM
    /// - LLM 不调用 tool（返回纯文本） → 视为任务自主完成
    /// - 安全阀：最大 tool 调用次数 + 最大运行时长
    ///
    /// `on_step` 回调用于向 UI 实时推送进度
    pub async fn run_agent<F>(
        &self,
        intent: &str,
        history: &mut Vec<Value>,
        max_tool_calls: u32,
        max_duration: Duration,
        mut on_step: F,
    ) -> AgentStopReason
    where
        F: FnMut(String) + Send,
    {
        let tools = self.mcp_server.list_tools();
        let start_time = Instant::now();
        let mut tool_call_count = 0u32;
        let mut consecutive_errors = 0u32;
        let max_consecutive_errors = 3u32;

        // 1. 初始化 System Prompt + 首条 user 消息（仅第一次）
        // OpenAI API 要求 system prompt 之后必须有 user 消息，否则 LLM 不响应
        if history.is_empty() {
            let system_prompt = self.build_system_prompt(intent);
            history.push(serde_json::json!({
                "role": "system",
                "content": system_prompt
            }));
            history.push(serde_json::json!({
                "role": "user",
                "content": format!(
                    "Start working on this goal: {}\n\
                     First, use browse_url to navigate to the target website, \
                     then call extract_semantic_dom to understand the page layout.",
                    intent
                )
            }));
        }

        on_step(format!("🤖 Agent 已启动，目标: '{}'\n", intent));
        log::info!("[Agent][DIAG] ▶▶▶ run_agent 已进入，history.len={}", history.len());


        loop {
            // 安全阀检查
            if start_time.elapsed() > max_duration {
                on_step(format!("⏱ 超出最大运行时长 ({:.0}s)\n", max_duration.as_secs_f32()));
                return AgentStopReason::Timeout;
            }

            on_step(format!("🔍 [Tool Call #{}/{}] 正在请求 LLM 决策...\n",
                tool_call_count + 1, max_tool_calls));

            // 直接请求 LLM —— LLM 通过调用 extract_semantic_dom 或 read_page_text 来感知页面
            // 不再在每轮强制 observe()，避免 DOM 提取阻塞整个循环
            log::info!("[Agent][DIAG] ▶ call_llm 开始...");
            let llm_result = self.call_llm(history, &tools).await;
            log::info!("[Agent][DIAG] ◀ call_llm 返回，is_ok={}", llm_result.is_ok());

            match llm_result {
                Err(e) => {
                    consecutive_errors += 1;
                    let err_str = e.to_string();
                    on_step(format!("⚠️ LLM 请求失败 ({}/{}): {}\n",
                        consecutive_errors, max_consecutive_errors, err_str));

                    if consecutive_errors >= max_consecutive_errors {
                        return AgentStopReason::ConsecutiveErrors(consecutive_errors);
                    }
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    continue;
                }


                // 4a. LLM 决定调用工具（支持并行/批量 tool_calls）
                Ok(LlmDecision::CallTools { raw_message, calls }) => {
                    consecutive_errors = 0;

                    // 将 LLM 的 assistant 消息推入 history（必须在所有 tool 响应之前）
                    history.push(raw_message);

                    // 顺序执行所有 tool_calls，每个结果单独推入 history
                    let batch_size = calls.len();
                    on_step(format!("📦 LLM 批量下达 {} 个工具调用\n", batch_size));

                    for (i, call) in calls.into_iter().enumerate() {
                        tool_call_count += 1;

                        on_step(format!("🛠 [Tool #{}/{} | Batch {}/{}] {} → {}\n",
                            tool_call_count, max_tool_calls,
                            i + 1, batch_size,
                            call.tool_name,
                            serde_json::to_string(&call.tool_args).unwrap_or_default()
                        ));

                        // 执行工具
                        let tool_result_text = match self.mcp_server
                            .call_tool(&call.tool_name, Some(call.tool_args))
                            .await
                        {
                            Ok(result) => {
                                let text = result.content.first()
                                    .map(|c| c.text.clone())
                                    .unwrap_or_else(|| "Done".to_string());
                                if result.is_error {
                                    format!("Tool Error: {}", text)
                                } else {
                                    text
                                }
                            }
                            Err(e) => {
                                format!("Tool execution failed: {}", e)
                            }
                        };

                        // 将工具结果推入 history（对应 assistant 消息中的 tool_call_id）
                        history.push(serde_json::json!({
                            "role": "tool",
                            "tool_call_id": call.call_id,
                            "content": tool_result_text
                        }));

                        on_step(format!("📋 工具结果: {}\n",
                            if tool_result_text.len() > 200 {
                                format!("{}...(truncated)", tool_result_text.chars().take(200).collect::<String>())
                            } else {
                                tool_result_text
                            }
                        ));

                        // 安全阀：达到最大调用次数时立即停止
                        if tool_call_count >= max_tool_calls {
                            on_step(format!("⏹ 达到最大工具调用次数 ({})\n", max_tool_calls));
                            return AgentStopReason::MaxToolCallsReached(tool_call_count);
                        }

                        // 批量中的每个工具间稍微等待，让页面稳定
                        tokio::time::sleep(Duration::from_millis(800)).await;
                    }

                    // 批量全部执行完后，稍微等待再返回给 LLM 做下一轮决策
                    tokio::time::sleep(Duration::from_millis(500)).await;
                }

                // 4b. LLM 决定完成任务（不调用 tool，返回自然语言结论）
                Ok(LlmDecision::Completed(conclusion)) => {
                    on_step(format!("🎯 Agent 完成任务: {}\n", conclusion));
                    // 将 LLM 的结论保存到 history
                    history.push(serde_json::json!({
                        "role": "assistant",
                        "content": conclusion
                    }));
                    return AgentStopReason::Completed(conclusion);
                }
            }
        }
    }

    /// 构建系统提示词
    fn build_system_prompt(&self, intent: &str) -> String {
        format!(
            "You are an advanced autonomous web automation agent. Your goal: '{}'.\n\
             \n\
             IMPORTANT: The system does NOT automatically observe the page for you. \
             You MUST call extract_semantic_dom or read_page_text yourself to understand the current page state \
             before deciding what to click or type. Think step by step.\n\
             \n\
             ## Available Tools\n\
             ### Navigation: browse_url(url), go_back\n\
             ### Page Sensing (CALL THESE TO SEE THE PAGE): extract_semantic_dom, read_page_text\n\
             ### Element Actions (require vid from DOM): click, type, hover\n\
             ### Global Actions: press_enter, press_tab, press_escape, scroll_down, scroll_up, wait\n\
             ### Social/Feed: scroll_human(rounds, direction)\n\
             ### Tabs: manage_tabs(action: list|new|activate|close, url?, target_id?)\n\
             ### Utilities: dismiss_cookie_banner, inject_session_cookies, inject_skill(script)\n\
             \n\
             ## Workflow (CRITICAL: USE PARALLEL TOOL CALLS)\n\
             To increase efficiency, you MUST batch multiple tool calls together whenever possible. \
             \n\
             1. **Independent Actions (e.g., opening multiple articles):**\n\
                If your goal is to \"randomly read 3 articles\", DO NOT open them one by one. You MUST output 3 separate `manage_tabs(action='new', url='...')` tool calls IN THE SAME RESPONSE.\n\
             \n\
             2. **Dependent Actions (e.g., click -> wait -> observe):**\n\
                Even though standard OpenAI APIs treat tool_calls as parallel, THIS specific Agent OS executes your tool calls STRICTLY SEQUENTIALLY. Therefore, you CAN and SHOULD batch dependent actions in one response.\n\
                - ✅ GOOD (Batching): [click(vid=15), wait(ms=2000), extract_semantic_dom()]\n\
                - ❌ BAD (One by one): [click(vid=15)] ...wait for user... [wait(ms=2000)] ...wait for user...\n\
             \n\
             When task is FULLY complete, respond with a Chinese summary (no tool call).",
            intent
        )
    }

    /// Observe 阶段：抓取当前页面 DOM 和截图
    #[allow(dead_code)]
    async fn observe(&self) -> Value {
        let dom_result = self.mcp_server.call_tool("extract_semantic_dom", None).await;
        let semantic_tree = dom_result.ok()
            .and_then(|r| r.content.into_iter().next())
            .map(|c| c.text)
            .unwrap_or_else(|| "Could not extract DOM - page may be loading.".to_string());

        let screenshot_b64 = self.mcp_server.capture_screenshot().await.unwrap_or_default();

        let is_vision_model = self.llm_model.contains("vision")
            || self.llm_model.contains("gpt-4o")
            || self.llm_model.contains("claude-3.5-sonnet");

        if is_vision_model && !screenshot_b64.is_empty() {
            serde_json::json!({
                "role": "user",
                "content": [
                    { "type": "text", "text": format!("Current DOM:\n{}", semantic_tree) },
                    { "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{}", screenshot_b64) } }
                ]
            })
        } else {
            serde_json::json!({
                "role": "user",
                "content": format!("Current DOM:\n{}", semantic_tree)
            })
        }
    }

    /// LLM 的决策结果
    async fn call_llm(
        &self,
        messages: &[Value],
        tools: &[crate::infrastructure::mcp::models::McpTool],
    ) -> Result<LlmDecision> {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .build()?;

        let api_tools: Vec<Value> = tools.iter().map(|t| serde_json::json!({
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.input_schema
            }
        })).collect();

        let body = serde_json::json!({
            "model": self.llm_model,
            "messages": messages,
            "tools": api_tools,
            "tool_choice": "auto",
            "parallel_tool_calls": true
        });

        let url = format!("{}/chat/completions", self.llm_base_url.trim_end_matches('/'));
        let mut req = client.post(&url).json(&body);
        if !self.llm_api_key.is_empty() {
            req = req.bearer_auth(&self.llm_api_key);
        }

        log::info!("[Agent][DIAG] ▶ 发送 HTTP 请求到: {}", url);
        let res = req.send().await.context("LLM API 请求失败")?;
        log::info!("[Agent][DIAG] ◀ HTTP 响应状态: {}", res.status());
        if !res.status().is_success() {
            let error_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("LLM API 错误: {}", error_text));
        }

        let response_json: Value = res.json().await
            .context("LLM 响应 JSON 解析失败")?;

        log::info!("[Agent] LLM 原始响应: {}", serde_json::to_string(&response_json).unwrap_or_default().chars().take(500).collect::<String>());

        let message = response_json.get("choices")
            .and_then(|c| c.as_array())
            .and_then(|a| a.first())
            .and_then(|f| f.get("message"))
            .ok_or_else(|| anyhow!("LLM 响应格式异常: 缺少 choices[0].message"))?;

        // 判断 finish_reason
        let finish_reason = response_json.get("choices")
            .and_then(|c| c.as_array())
            .and_then(|a| a.first())
            .and_then(|f| f.get("finish_reason"))
            .and_then(|r| r.as_str())
            .unwrap_or("stop");

        // 如果有 tool_calls → CallTools（支持多个并行调用）
        if finish_reason == "tool_calls" || message.get("tool_calls").is_some() {
            if let Some(tool_calls) = message.get("tool_calls").and_then(|t| t.as_array()) {
                let mut calls = Vec::new();

                for tc in tool_calls {
                    if let Some(function) = tc.get("function") {
                        let call_id = tc.get("id")
                            .and_then(|i| i.as_str()).unwrap_or("").to_string();
                        let name = function.get("name")
                            .and_then(|n| n.as_str()).unwrap_or("").to_string();
                        let args_str = function.get("arguments")
                            .and_then(|a| a.as_str()).unwrap_or("{}");
                        let arguments: Value = serde_json::from_str(args_str)
                            .unwrap_or_else(|_| serde_json::json!({}));

                        log::info!("[Agent] 工具调用: {} args={}", name, args_str);
                        calls.push(ToolCallInfo {
                            call_id,
                            tool_name: name,
                            tool_args: arguments,
                        });
                    }
                }

                if !calls.is_empty() {
                    log::info!("[Agent] 决策: 批量调用 {} 个工具", calls.len());

                    // 构建合法的 raw_message（确保 content 字段存在）
                    let mut raw_msg = message.clone();
                    if let Some(obj) = raw_msg.as_object_mut() {
                        obj.entry("content").or_insert(Value::Null);
                    }

                    return Ok(LlmDecision::CallTools {
                        raw_message: raw_msg,
                        calls,
                    });
                }
            }
        }

        // 否则 → LLM 完成任务，返回文本结论
        let conclusion = message.get("content")
            .and_then(|c| c.as_str())
            .unwrap_or("任务已完成")
            .to_string();

        log::info!("[Agent] 决策: 任务完成，结论={}", conclusion);
        Ok(LlmDecision::Completed(conclusion))
    }
}

/// 单个工具调用信息
struct ToolCallInfo {
    call_id: String,
    tool_name: String,
    tool_args: Value,
}

/// LLM 的决策枚举
enum LlmDecision {
    /// LLM 返回了一个或多个工具调用（Parallel Tool Calls）
    CallTools {
        raw_message: Value,
        calls: Vec<ToolCallInfo>,
    },
    /// LLM 决定任务完成，返回自然语言结论
    Completed(String),
}
