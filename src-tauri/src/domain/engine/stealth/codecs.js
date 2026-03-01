// L1.5 Stealth Payload: Video / Audio Codec Emulation
// Fakes support for codecs that the host Chrome instance might not natively support (e.g. H.264 on some Chromium builds)

(function() {
    try {
        const canPlayTypeProxy = new Proxy(HTMLMediaElement.prototype.canPlayType, {
            apply: function(target, thisArg, argumentsList) {
                const type = argumentsList[0] || '';
                
                // Pretend to support commercial codecs if requested
                // Used heavily in fingerprint testing to separate Chromium vs Google Chrome
                if (type.includes('mp4') || type.includes('h264') || type.includes('avc1')) {
                    if (window.__veil_profile?.support_commercial_codecs) {
                        return "probably";
                    }
                }
                
                return Reflect.apply(target, thisArg, argumentsList);
            }
        });

        Object.defineProperty(HTMLMediaElement.prototype, 'canPlayType', {
            value: canPlayTypeProxy,
            writable: true,
            configurable: true
        });
        
    } catch(e) {}
})();
