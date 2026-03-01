use super::models::{ActionCacheLock, SkillScript};
use super::parser::SkillParser;
use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};

/// 提供本地技能文件的读取和 `.lock.json` 缓存存取的服务
#[allow(dead_code)]
pub struct SkillStore {
    base_dir: PathBuf,
}

impl SkillStore {
    pub fn new<P: AsRef<Path>>(base_dir: P) -> Self {
        // 确保 skills 根目录存在
        if !base_dir.as_ref().exists() {
            let _ = fs::create_dir_all(&base_dir);
        }
        Self {
            base_dir: base_dir.as_ref().to_path_buf(),
        }
    }

    /// 给定相对路径 (如 `xiaohongshu/post.md`)，加载并解析该技能
    pub fn load_skill(&self, rel_path: &str) -> Result<SkillScript> {
        let full_path = self.base_dir.join(rel_path);
        let content = fs::read_to_string(&full_path)
            .with_context(|| format!("Failed to read skill file: {:?}", full_path))?;
        
        SkillParser::parse_markdown(&content)
    }

    /// 获取与某个 MD 文件对应的 Lock 缓存文件路径
    fn get_lock_path(&self, rel_path: &str) -> PathBuf {
        let mut path = self.base_dir.join(rel_path);
        path.set_extension("lock.json");
        path
    }

    /// 读取与某个技能对应的缓存锁文件
    pub fn load_cache_lock(&self, rel_path: &str) -> Result<Option<ActionCacheLock>> {
        let lock_path = self.get_lock_path(rel_path);
        if !lock_path.exists() {
            return Ok(None);
        }
        
        let content = fs::read_to_string(&lock_path)?;
        let lock: ActionCacheLock = serde_json::from_str(&content)
            .with_context(|| format!("Failed to parse lockfile: {:?}", lock_path))?;
        
        Ok(Some(lock))
    }

    /// 保存由 Discovery 后端执行成功的 action 缓存锁
    pub fn save_cache_lock(&self, rel_path: &str, lock: &ActionCacheLock) -> Result<()> {
        let lock_path = self.get_lock_path(rel_path);
        let content = serde_json::to_string_pretty(lock)?;
        fs::write(&lock_path, content)?;
        
        Ok(())
    }

    /// 计算原始 MD 文本的极简 Hash (用来在写入 Lockfile 时校验一致性)
    pub fn compute_skill_hash(markdown: &str) -> String {
        use std::hash::{Hash, Hasher};
        use std::collections::hash_map::DefaultHasher;
        let mut hasher = DefaultHasher::new();
        markdown.hash(&mut hasher);
        format!("{:016x}", hasher.finish())
    }
}
