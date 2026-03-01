use std::collections::HashMap;
use std::net::TcpListener;
use std::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PortDomain {
    Cdp,
    Internal,
    Api,
    Proxy,
}

struct PortRange {
    min: u16,
    max: u16,
}

impl PortDomain {
    fn range(&self) -> PortRange {
        match self {
            PortDomain::Cdp => PortRange { min: 10000, max: 11000 },
            PortDomain::Internal => PortRange { min: 11001, max: 11990 },
            PortDomain::Api => PortRange { min: 11991, max: 12000 },
            PortDomain::Proxy => PortRange { min: 50000, max: 55000 },
        }
    }
}

pub struct PortManager {
    // Port mappings: port -> owner_id
    occupied_ports: Mutex<HashMap<u16, String>>,
    // Cursors for domains to allow round-robin port allocation
    cursors: Mutex<HashMap<PortDomain, u16>>,
}

impl PortManager {
    pub fn new() -> Self {
        let mut cursors = HashMap::new();
        let domains = [PortDomain::Cdp, PortDomain::Internal, PortDomain::Api, PortDomain::Proxy];
        
        for &domain in &domains {
            cursors.insert(domain, domain.range().min);
        }

        Self {
            occupied_ports: Mutex::new(HashMap::new()),
            cursors: Mutex::new(cursors),
        }
    }

    /// Acquires an available port physically bound to the system and marks it as occupied.
    pub fn acquire(&self, domain: PortDomain, owner_id: &str) -> Result<u16, String> {
        let policy = domain.range();
        
        // Block until we lock both occupied and cursor sets
        let mut occupied = self.occupied_ports.lock().map_err(|e| format!("Occupied Mutex Error: {}", e))?;
        let mut cursors = self.cursors.lock().map_err(|e| format!("Cursor Mutex Error: {}", e))?;
        
        let start_port = *cursors.get(&domain).unwrap_or(&policy.min);
        let mut current_port = start_port;

        let total_ports = policy.max - policy.min + 1;
        
        for _ in 0..total_ports {
            if !occupied.contains_key(&current_port) && Self::is_port_available(current_port) {
                occupied.insert(current_port, owner_id.to_string());
                
                let next_port = if current_port >= policy.max { policy.min } else { current_port + 1 };
                cursors.insert(domain, next_port);
                
                log::info!("[PortManager] Successfully allocated port {} in domain {:?} to owner {}", current_port, domain, owner_id);
                return Ok(current_port);
            }

            current_port += 1;
            if current_port > policy.max {
                current_port = policy.min;
            }
        }
        
        Err(format!("PortManager: No available ports in domain {:?} (range {}-{})", domain, policy.min, policy.max))
    }

    /// Releases a port back to the pool
    pub fn release(&self, port: u16) {
        if let Ok(mut occupied) = self.occupied_ports.lock() {
            if let Some(owner) = occupied.remove(&port) {
                log::debug!("[PortManager] Port {} released by owner {}", port, owner);
            }
        }
    }

    /// Releases all ports assigned to a specific owner
    #[allow(dead_code)]
    pub fn release_by_owner(&self, owner_id: &str) {
        if let Ok(mut occupied) = self.occupied_ports.lock() {
            occupied.retain(|port, owner| {
                if owner == owner_id {
                    log::debug!("[PortManager] Port {} released by owner {}", port, owner_id);
                    false // Remove
                } else {
                    true // Keep
                }
            });
        }
    }

    /// Fetches the first occupied CDP port (useful for 1-1 session mapping)
    #[allow(dead_code)]
    pub fn get_first_cdp_port(&self) -> Option<u16> {
        let domain = PortDomain::Cdp;
        if let Ok(occupied) = self.occupied_ports.lock() {
            for &port in occupied.keys() {
                if domain.range().min <= port && port <= domain.range().max {
                    return Some(port);
                }
            }
        }
        None
    }

    /// Physically verifies if the port is available by attempting to bind a TCP listener.
    fn is_port_available(port: u16) -> bool {
        match TcpListener::bind(("127.0.0.1", port)) {
            Ok(listener) => {
                // Successfully bound, meaning it's physical available. Drop it to release.
                drop(listener);
                true
            },
            Err(_) => false,
        }
    }
}
