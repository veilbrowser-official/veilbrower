use tauri::command;
use std::time::Instant;

#[command]
pub async fn check_proxy_latency(address: String) -> Result<u32, String> {
    log::info!("[Gateway] Checking latency for proxy: {}", address);
    
    // Ensure the address has a scheme. If it's just host:port, default to http://
    let proxy_url = if !address.contains("://") {
        format!("http://{}", address)
    } else {
        address.clone()
    };

    let proxy = reqwest::Proxy::all(&proxy_url)
        .map_err(|e| format!("Invalid proxy URL: {}", e))?;
        
    let client = reqwest::Client::builder()
        .proxy(proxy)
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;
        
    let start = Instant::now();
    
    // Use a fast and reliable endpoint for connectivity testing
    let res = client.get("http://gstatic.com/generate_204")
        .send()
        .await
        .map_err(|e| format!("Proxy connection failed: {}", e))?;
        
    if !res.status().is_success() {
        return Err(format!("Proxy returned error status: {}", res.status()));
    }
    
    let latency = start.elapsed().as_millis() as u32;
    log::info!("[Gateway] Proxy {} latency: {} ms", address, latency);
    Ok(latency)
}
