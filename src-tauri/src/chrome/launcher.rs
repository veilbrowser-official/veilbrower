use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use anyhow::{Result, Context};
use std::path::PathBuf;

#[derive(Clone)]
pub struct ChromeLauncher {
    processes: Arc<Mutex<Vec<Child>>>,
}

/// 浏览器启动选项 - 供 LLM 通过 launch_context MCP 工具动态控制
#[derive(Debug, Clone)]
pub struct LaunchOptions {
    /// 是否以无界面模式启动（适合低对抗性批量采集任务）
    pub headless: bool,
    /// CDP 远程调试端口（由 PortManager 动态分配，范围 10000-11000）
    pub cdp_port: u16,
    /// 视口宽度，默认 1440
    pub viewport_width: u32,
    /// 视口高度，默认 900
    pub viewport_height: u32,
    /// 可选代理 URL，格式: http://user:pass@host:port
    pub proxy: Option<String>,
    /// 反检测强度: "off" / "low" / "high"
    pub stealth_level: String,
    /// 初始导航 URL（默认 about:blank）
    pub initial_url: String,
}

impl Default for LaunchOptions {
    fn default() -> Self {
        Self {
            headless: false,
            cdp_port: 9222, // 向后兼容的默认值，生产环境应由 PortManager 分配
            viewport_width: 1440,
            viewport_height: 900,
            proxy: None,
            stealth_level: "high".to_string(),
            initial_url: "about:blank".to_string(),
        }
    }
}

impl ChromeLauncher {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// 启动 Standard Chrome 进程（向后兼容，使用默认选项）
    pub fn launch(&self, url: &str, profile_id: &str) -> Result<u32> {
        let mut opts = LaunchOptions::default();
        opts.initial_url = url.to_string();
        self.launch_with_options(profile_id, opts)
    }

    /// 使用完整配置启动 Chrome 进程
    ///
    /// 对应 Playwright MCP 的 `browser_launch`，由 LLM 通过 launch_context 工具控制
    pub fn launch_with_options(&self, profile_id: &str, opts: LaunchOptions) -> Result<u32> {
        log::info!("[Chrome Launcher] 启动 Chrome: profile={}, port={}, headless={}, stealth={}, proxy={:?}",
            profile_id, opts.cdp_port, opts.headless, opts.stealth_level, opts.proxy);

        let chrome_path = Self::get_chrome_binary_path()?;

        // 用户数据目录：物理隔离每个 Profile
        let user_data_dir = std::env::temp_dir().join(format!("veilbrowser-profiles/{}", profile_id));
        std::fs::create_dir_all(&user_data_dir)
            .context("Failed to create user data directory")?;

        let mut cmd = Command::new(&chrome_path);

        // ── 基础隔离参数 ────────────────────────────────────────────────
        cmd.arg(format!("--user-data-dir={}", user_data_dir.display()))
           .arg(format!("--remote-debugging-port={}", opts.cdp_port)) // 动态端口！
           .arg("--no-first-run")
           .arg("--no-default-browser-check")
           .arg("--test-type")
           .arg("--disable-blink-features=AutomationControlled");

        // ── Headless 模式 ────────────────────────────────────────────────
        if opts.headless {
            cmd.arg("--headless=new"); // Chrome 112+ 新 headless，支持完整 CDP
            cmd.arg("--disable-gpu"); // headless 下禁用 GPU 加速（节省资源）
        }

        // ── 视口 ─────────────────────────────────────────────────────────
        cmd.arg(format!("--window-size={},{}", opts.viewport_width, opts.viewport_height));

        // ── 代理 ─────────────────────────────────────────────────────────
        if let Some(ref proxy_url) = opts.proxy {
            if !proxy_url.is_empty() {
                cmd.arg(format!("--proxy-server={}", proxy_url));
                // 绕过本地地址的代理
                cmd.arg("--proxy-bypass-list=<-loopback>");
            }
        }

        // ── Stealth 相关 (级别 low 时关闭部分追踪，high 时在外部通过 CDP 注入) ──
        if opts.stealth_level == "off" {
            // 不注入任何反检测
        } else {
            // 基础反检测 flag（high/low 都加）
            cmd.arg("--disable-infobars");
        }

        // ── 初始 URL ─────────────────────────────────────────────────────
        cmd.arg(&opts.initial_url);

        log::info!("[Chrome Launcher] Args: {:?}", cmd.get_args());

        let child = cmd.spawn().context("Failed to launch Chrome browser")?;
        let pid = child.id();

        self.processes.lock().unwrap().push(child);

        log::info!("[Chrome Launcher] Chrome 已启动, PID={}, headless={}", pid, opts.headless);
        Ok(pid)
    }

    /// 获取标准 Chrome 可执行文件路径
    fn get_chrome_binary_path() -> Result<PathBuf> {
        // 1. 优先检查环境变量覆盖
        if let Ok(env_path) = std::env::var("VEIL_CHROME_PATH") {
            let path = PathBuf::from(env_path);
            if path.exists() {
                return Ok(path);
            }
        }

        // 2. 按平台定义的预设路径查找
        #[cfg(target_os = "macos")]
        {
            let paths = [
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
                "/Applications/Chromium.app/Contents/MacOS/Chromium",
            ];
            for p in paths {
                if std::path::Path::new(p).exists() {
                    return Ok(PathBuf::from(p));
                }
            }
        }
        
        #[cfg(target_os = "windows")]
        {
            let mut paths = vec![
                r#"C:\Program Files\Google\Chrome\Application\chrome.exe"#,
                r#"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"#,
                r#"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"#,
                r#"C:\Program Files\Microsoft\Edge\Application\msedge.exe"#,
            ];

            // 增加用户级别安装路径 (Local AppData)
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let user_chrome = PathBuf::from(&local_app_data).join(r#"Google\Chrome\Application\chrome.exe"#);
                let user_edge = PathBuf::from(&local_app_data).join(r#"Microsoft\Edge\Application\msedge.exe"#);
                if user_chrome.exists() { return Ok(user_chrome); }
                if user_edge.exists() { return Ok(user_edge); }
            }

            for p in paths {
                if std::path::Path::new(p).exists() {
                    return Ok(PathBuf::from(p));
                }
            }
        }
        
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            let binaries = [
                "google-chrome-stable",
                "google-chrome",
                "microsoft-edge-stable",
                "microsoft-edge",
                "chromium-browser",
                "chromium",
            ];
            
            // 尝试在 PATH 中查找
            for bin in binaries {
                if let Ok(path) = Self::find_it(bin) {
                    return Ok(path);
                }
            }

            // 兜底常用绝对路径
            let paths = [
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/microsoft-edge-stable",
                "/usr/bin/chromium-browser",
                "/usr/bin/chromium",
            ];
            for p in paths {
                if std::path::Path::new(p).exists() {
                    return Ok(PathBuf::from(p));
                }
            }
        }

        anyhow::bail!("无法找到 Google Chrome 或 Microsoft Edge。请确保已安装浏览器或设置 VEIL_CHROME_PATH 环境变量。");
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    fn find_it(bin: &str) -> Result<PathBuf> {
        let output = std::process::Command::new("which")
            .arg(bin)
            .output()?;
        if output.status.success() {
            let path_str = String::from_utf8(output.stdout)?.trim().to_string();
            if !path_str.is_empty() {
                return Ok(PathBuf::from(path_str));
            }
        }
        anyhow::bail!("Not found")
    }
    
    /// 停止所有受管 Chrome 进程
    #[allow(dead_code)]
    pub fn shutdown_all(&self) -> Result<()> {
        let mut processes = self.processes.lock().unwrap();
        log::info!("[Chrome Launcher] 正在关闭 {} 个 Chrome 进程", processes.len());
        
        for child in processes.iter_mut() {
            let _ = child.kill();
        }
        processes.clear();
        Ok(())
    }
}

// 移除 Drop 实现，防止克隆的对象销毁时误杀进程
/*
impl Drop for ChromeLauncher {
    fn drop(&mut self) {
        let _ = self.shutdown_all();
    }
}
*/
