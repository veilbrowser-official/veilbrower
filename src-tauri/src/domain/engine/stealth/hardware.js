// L1.5 Stealth Payload: Hardware Properties & Webdriver Spoofing
// Conceals automation and overrides standard navigator properties.

(function() {
    try {
        // 1. Remove automation flags
        Object.defineProperty(Navigator.prototype, 'webdriver', {
            get: () => undefined,
            configurable: true,
            enumerable: true
        });

        // 2. Erase CDC signatures from standard bindings
        let keys = Object.getOwnPropertyNames(window);
        for (let i = 0; i < keys.length; i++) {
            if (keys[i].startsWith('cdc_')) {
                delete window[keys[i]];
            }
        }

        // 3. Spoof HardwareConcurrency and DeviceMemory
        if (window.__veil_profile?.hardware_concurrency) {
            Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
                get: () => window.__veil_profile.hardware_concurrency,
                configurable: true,
                enumerable: true
            });
        }

        if (window.__veil_profile?.device_memory) {
            Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                get: () => window.__veil_profile.device_memory,
                configurable: true,
                enumerable: true
            });
        }
        
        // 4. Overwrite permissions API for Notifications
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = parameters => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );

    } catch(e) {}
})();
