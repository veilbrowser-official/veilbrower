use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 表示一个通过 Markdown 解析出的原始、与 LLM/底层交互的技能剧本
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillScript {
    /// 技能名称，例如 "小红书自动发图文"
    pub name: String,
    /// 技能描述
    pub description: String,
    /// 所属分类标签，例如 "小红书自动化套件"
    pub category: String,
    /// 该技能涵盖的参数列表
    pub parameters: Vec<SkillParameter>,
    /// 由自然语言描述的执行序列
    pub steps: Vec<SkillStep>,
    /// 原始 Markdown 内容
    pub raw_markdown: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub script: SkillScript,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillParameter {
    /// 变量名，例如 "title" (对应 {{title}})
    pub name: String,
    /// 变量描述
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStep {
    /// 步骤序号
    pub index: usize,
    /// 自然语言意图，例如 "点击发布按钮"
    pub intent: String,
}

/// =========================================
/// 以下是机器读取的 `.lock.json` 缓存锁地图
/// =========================================

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionCacheLock {
    /// 对应 Markdown 文件的哈希值，用于校验脚本是否被修改
    pub hash: String,
    /// 步骤缓存映射字典，键为 step index
    pub steps_cache: HashMap<usize, CachedAction>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedAction {
    /// 对应 Markdown 中的 intent，作为冗余校验
    pub intent: String,
    /// 由 LLM Discovery 阶段发掘出的准确 CSS 选择器或 XPath
    pub selector: String,
    /// 原子动作类型: "click", "type", "upload", "navigate", "wait"
    pub action_type: String,
    /// 其他可能需要的具体参数，例如输入的内容模板
    pub action_params: Option<serde_json::Value>,
}
