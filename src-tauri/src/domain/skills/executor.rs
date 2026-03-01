use std::collections::HashMap;
use std::sync::Arc;
use tokio::time::Duration;
use anyhow::{Result, Context};

use super::models::{SkillScript, ActionCacheLock, CachedAction};

// 原子 CDP 能力接口，由 L5 发现器或 L4 执行器调用
#[allow(dead_code)]
#[async_trait::async_trait]
pub trait CdpClientIntermediary: Send + Sync {
    async fn navigate(&self, url: &str) -> Result<()>;
    async fn click_selector(&self, selector: &str) -> Result<()>;
    async fn type_text(&self, selector: &str, text: &str) -> Result<()>;
    async fn wait_for_selector(&self, selector: &str, timeout_ms: u64) -> Result<()>;
    async fn simulate_keypress(&self, key: &str) -> Result<()>;
    async fn wait_time(&self, ms: u64) -> Result<()>;
}

/// Skill 执行器引擎：负责执行已锁定的 (L5) 指纹路径
#[allow(dead_code)]
pub struct SkillExecutor {
    cdp: Arc<dyn CdpClientIntermediary>,
    discovery_service: Option<Arc<crate::domain::agent::discovery::DiscoveryService>>,
}

impl SkillExecutor {
    pub fn new(
        cdp: Arc<dyn CdpClientIntermediary>,
        discovery_service: Option<Arc<crate::domain::agent::discovery::DiscoveryService>>
    ) -> Self {
        Self { cdp, discovery_service }
    }

    pub async fn execute(
        &self, 
        script: &SkillScript, 
        lock: &ActionCacheLock, 
        params: &HashMap<String, String>
    ) -> Result<()> {
        log::info!("Executing locked skill path: {}", script.name);

        for step in &script.steps {
            // 如果缓存未命中，则回退到 Discovery (L5) 阶段进行动态发掘
            let action_cache = match lock.steps_cache.get(&step.index) {
                Some(ac) => ac.clone(),
                None => {
                    // discover_step 已随旧 OODA 架构废弃；
                    // 现在 Agent 通过 run_agent 完整会话来处理未缓存的步骤。
                    return Err(anyhow::anyhow!(
                        "缓存未命中 (step {})，自愈路径已迁移至 run_agent 全流程。", step.index
                    ));
                }
            };

            let interpolated_action = self.interpolate_action(&action_cache, params)?;
            self.execute_action(&interpolated_action).await?;
        }

        Ok(())
    }

    async fn execute_action(&self, action: &CachedAction) -> Result<()> {
        let selector = action.selector.as_str();
        
        if !selector.is_empty() {
            self.cdp.wait_for_selector(selector, 10_000).await?;
        }

        match action.action_type.as_str() {
            "navigate" => {
                let url = action.action_params.as_ref().and_then(|p| p.get("url")).and_then(|v| v.as_str()).unwrap_or("");
                if !url.is_empty() {
                    self.cdp.navigate(url).await?;
                } else {
                    return Err(anyhow::anyhow!("Missing 'url' parameter for navigate action"));
                }
            },
            "click" => self.cdp.click_selector(selector).await?,
            "type" => {
                let text = action.action_params.as_ref().and_then(|p| p.get("text")).and_then(|v| v.as_str()).unwrap_or("");
                self.cdp.type_text(selector, text).await?;
            },
            "keypress" => {
                let key = action.action_params.as_ref().and_then(|p| p.get("text")).and_then(|v| v.as_str()).unwrap_or("Enter");
                self.cdp.simulate_keypress(key).await?;
            },
            "wait" => {
                let ms: u64 = selector.parse().unwrap_or(2000);
                self.cdp.wait_time(ms).await?;
            }
            _ => return Err(anyhow::anyhow!("Unsupported action: {}", action.action_type)),
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
        Ok(())
    }

    fn interpolate_action(&self, action: &CachedAction, _params: &HashMap<String, String>) -> Result<CachedAction> {
        // ... 之前的占位符替换逻辑 ...
        Ok(action.clone())
    }
}
