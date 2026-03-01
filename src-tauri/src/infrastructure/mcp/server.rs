use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::net::{TcpListener, TcpStream};
use futures_util::{StreamExt, SinkExt};

use crate::infrastructure::port_manager::{PortManager, PortDomain};
use super::models::{McpRequest, McpResponse};
use super::tools::McpServer;

pub async fn start_server(app_handle: AppHandle) {
    let port_manager = app_handle.state::<PortManager>();
    let port = port_manager.acquire(PortDomain::Api, "mcp_server").unwrap_or(11991);
    
    let addr = format!("127.0.0.1:{}", port);
    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            log::error!("❌ [MCP] Failed to bind WebSocket TCP listener on {}: {}", addr, e);
            return;
        }
    };
    
    log::info!("✅ [MCP] WebSocket JSON-RPC Server listening on ws://{}", addr);

    while let Ok((stream, _)) = listener.accept().await {
        let app_handle_clone = app_handle.clone();
        tokio::spawn(async move {
            handle_connection(stream, app_handle_clone).await;
        });
    }
}

async fn handle_connection(stream: TcpStream, app_handle: AppHandle) {
    let mut ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            log::error!("❌ [MCP] WebSocket handshake failed: {}", e);
            return;
        }
    };
    
    log::info!("✅ [MCP] New WebSocket connection established from LLM Agent");
    
    let mcp_server = Arc::new(McpServer::new(app_handle));

    while let Some(msg) = ws_stream.next().await {
        match msg {
            Ok(msg) => {
                if msg.is_text() {
                    let text = msg.to_string();
                    log::debug!("[MCP] Received JSON-RPC Request: {}", text);
                    
                    if let Ok(req) = serde_json::from_str::<McpRequest>(&text) {
                        let response = handle_request(req, mcp_server.clone()).await;
                        if let Ok(resp_str) = serde_json::to_string(&response) {
                            let _ = ws_stream.send(tokio_tungstenite::tungstenite::Message::Text(resp_str.into())).await;
                        }
                    } else {
                        log::warn!("⚠️ [MCP] Failed to parse JSON-RPC request: {}", text);
                    }
                }
            },
            Err(e) => {
                log::error!("❌ [MCP] WebSocket error: {}", e);
                break;
            }
        }
    }
    
    log::info!("✅ [MCP] WebSocket connection closed");
}

async fn handle_request(req: McpRequest, mcp_server: Arc<McpServer>) -> McpResponse {
    match req.method.as_str() {
        "tools/list" => {
            let tools = mcp_server.list_tools();
            McpResponse::success(req.id, serde_json::json!({ "tools": tools }))
        },
        "tools/call" => {
            if let Some(params) = req.params {
                let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
                let arguments = params.get("arguments").cloned();
                
                match mcp_server.call_tool(name, arguments).await {
                    Ok(result) => {
                        let res_val = serde_json::to_value(result).unwrap_or(serde_json::json!({}));
                        McpResponse::success(req.id, res_val)
                    },
                    Err(e) => {
                        let is_error_result = super::models::CallToolResult {
                            content: vec![super::models::ToolContent {
                                content_type: "text".into(),
                                text: format!("Error executing tool: {:?}", e),
                            }],
                            is_error: true,
                        };
                        McpResponse::success(req.id, serde_json::to_value(is_error_result).unwrap_or(serde_json::json!({})))
                    }
                }
            } else {
                McpResponse::error(req.id, -32602, "Invalid params")
            }
        },
        _ => {
            McpResponse::error(req.id, -32601, "Method not found")
        }
    }
}
