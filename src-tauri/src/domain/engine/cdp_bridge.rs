use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};

pub struct CdpBridge {
    #[allow(dead_code)]
    pub ws_url: String,
    pub cdp_port: u16,
}

impl CdpBridge {
    pub fn new(cdp_port: u16) -> Self {
        let ws_url = format!("ws://127.0.0.1:{}/devtools/browser", cdp_port);
        Self { ws_url, cdp_port }
    }
    
    /// Wait for the CDP port to become available
    pub async fn wait_for_port(&self, timeout_secs: u64) -> Result<(), &'static str> {
        let start = std::time::Instant::now();
        let timeout_duration = Duration::from_secs(timeout_secs);
        let target = format!("127.0.0.1:{}", self.cdp_port);

        while start.elapsed() < timeout_duration {
            if let Ok(Ok(_)) = timeout(Duration::from_millis(200), TcpStream::connect(&target)).await {
                log::info!("[CDP Bridge] Successfully connected to port {}", self.cdp_port);
                return Ok(());
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
        
        Err("Timeout waiting for CDP port to open")
    }
}
