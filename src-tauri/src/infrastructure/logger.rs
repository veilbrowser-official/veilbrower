use log::{Log, Metadata, Record, LevelFilter};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use std::cell::Cell;

// 线程局部变量，用于防止日志递归调用导致死锁或溢出
thread_local! {
    static IN_LOG: Cell<bool> = const { Cell::new(false) };
}

struct TauriLogger {
    app_handle: Arc<Mutex<Option<AppHandle>>>,
}

impl Log for TauriLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= log::max_level() && metadata.target() != "tao" // 过滤掉底层窗口库的琐碎日志
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }

        // 检查当前线程是否已经在处理日志，防止 emit 触发递归日志
        let already_logging = IN_LOG.with(|in_log| {
            if in_log.get() {
                true
            } else {
                in_log.set(true);
                false
            }
        });

        if already_logging {
            return;
        }

        let level_str = match record.level() {
            log::Level::Error => "ERROR",
            log::Level::Warn => "WARN",
            log::Level::Info => "INFO",
            log::Level::Debug => "DEBUG",
            log::Level::Trace => "TRACE",
        };
        
        let target = record.target();
        let src_tag = if target.contains("cdp_client") || target.contains("cdp_bridge") {
            "CDP Engine"
        } else if target.contains("agent") || target.contains("discovery") {
            "Agent OS"
        } else if target.contains("identities") || target.contains("vault") {
            "Identity Vault"
        } else if target.contains("mcp") {
            "MCP Server"
        } else {
            "Rust Core"
        };

        let msg = format!("{}", record.args());
        
        // 打印到终端 (使用标准流，不经过 log 宏)
        eprintln!("[{}] [{}] {}", level_str, src_tag, msg);

        // 转发到前端
        if let Ok(guard) = self.app_handle.lock() {
            if let Some(app) = guard.as_ref() {
                let now = chrono::Local::now().format("%H:%M:%S%.3f").to_string();
                let _ = app.emit("system-log", serde_json::json!({
                    "time": now,
                    "level": level_str,
                    "src": src_tag,
                    "msg": msg
                }));
            }
        }

        // 恢复线程状态
        IN_LOG.with(|in_log| in_log.set(false));
    }

    fn flush(&self) {}
}

lazy_static::lazy_static! {
    static ref LOGGER: TauriLogger = TauriLogger {
        app_handle: Arc::new(Mutex::new(None)),
    };
}

pub fn init_logger() {
    let _ = log::set_logger(&*LOGGER).map(|()| log::set_max_level(LevelFilter::Info));
}

pub fn set_app_handle(app: AppHandle) {
    if let Ok(mut guard) = LOGGER.app_handle.lock() {
        *guard = Some(app);
    }
}