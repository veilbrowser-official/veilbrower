use sysinfo::{System, Networks};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub fn start_system_monitor(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut sys = System::new_all();
        let mut networks = Networks::new_with_refreshed_list();
        // Initial refresh
        sys.refresh_all();
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        loop {
            sys.refresh_cpu_usage();
            sys.refresh_memory();
            networks.refresh(true);

            let cpus = sys.cpus();
            let cpu_usage = if !cpus.is_empty() {
                cpus.iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / cpus.len() as f32
            } else {
                0.0
            };

            let total_mem = sys.total_memory();
            let used_mem = sys.used_memory();
            let mem_usage_mb = used_mem / 1024 / 1024;
            
            let _ = app_handle.emit("system-metrics", serde_json::json!({
                "cpu_percent": format!("{:.1}", cpu_usage),
                "ram_mb": mem_usage_mb,
                "ram_percent": if total_mem > 0 { (used_mem as f64 / total_mem as f64 * 100.0) as u32 } else { 0 },
                "net_kbps": "0" // Placeholder
            }));

            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
}