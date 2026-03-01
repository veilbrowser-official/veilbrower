use super::models::{SkillParameter, SkillScript, SkillStep};
use regex::Regex;
use anyhow::{Result, anyhow};

pub struct SkillParser;

impl SkillParser {
    /// 恢复为原始设计：解析 Markdown 中的自然语言意图 (NL Intent)
    /// 这些意图将通过 L5 的 Discovery 流程在运行时动态匹配为 Action。
    pub fn parse_markdown(content: &str) -> Result<SkillScript> {
        let name_re = Regex::new(r"#\s*技能名称:\s*(.+)").unwrap();
        let desc_re = Regex::new(r"#\s*描述:\s*(.+)").unwrap();
        let cat_re = Regex::new(r"#\s*所属分类:\s*(.+)").unwrap();
        
        let param_re = Regex::new(r"-\s*\{\{([a-zA-Z0-9_]+)\}\}:\s*(.+)").unwrap();
        let step_re = Regex::new(r"(?m)^(\d+)\.\s+(.+)$").unwrap();

        let name = name_re.captures(content)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_else(|| "Untitled Skill".to_string());

        let description = desc_re.captures(content)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_default();

        let category = cat_re.captures(content)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().trim().to_string())
            .unwrap_or_else(|| "Uncategorized".to_string());

        let mut parameters = Vec::new();
        for cap in param_re.captures_iter(content) {
            parameters.push(SkillParameter {
                name: cap[1].to_string(),
                description: cap[2].trim().to_string(),
            });
        }

        let mut steps = Vec::new();
        for cap in step_re.captures_iter(content) {
            if let Ok(index) = cap[1].parse::<usize>() {
                steps.push(SkillStep {
                    index,
                    intent: cap[2].trim().to_string(),
                });
            }
        }

        Ok(SkillScript {
            name,
            description,
            category,
            parameters,
            steps,
            raw_markdown: content.to_string(),
        })
    }
}
