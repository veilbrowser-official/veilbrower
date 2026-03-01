// L1.5 Stealth Payload: WebGL Vendor and Renderer Spoofing
// Dynamically intercepts getParameter to enforce consistency with the simulated profile.
// Required input: `__veil_profile.webgl_vendor` and `__veil_profile.webgl_renderer`

(function() {
    try {
        const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
            apply: function(target, thisArg, argumentsList) {
                const param = argumentsList[0];
                // UNMASKED_VENDOR_WEBGL = 37445
                if (param === 37445 && window.__veil_profile?.webgl_vendor) {
                    return window.__veil_profile.webgl_vendor;
                }
                // UNMASKED_RENDERER_WEBGL = 37446
                if (param === 37446 && window.__veil_profile?.webgl_renderer) {
                    return window.__veil_profile.webgl_renderer;
                }
                return Reflect.apply(target, thisArg, argumentsList);
            }
        });

        Object.defineProperty(WebGLRenderingContext.prototype, 'getParameter', {
            value: getParameterProxy,
            writable: true,
            configurable: true
        });

        // Similarly patch WebGL2 if available
        if (typeof WebGL2RenderingContext !== 'undefined') {
            const getParameterProxy2 = new Proxy(WebGL2RenderingContext.prototype.getParameter, {
                apply: function(target, thisArg, argumentsList) {
                    const param = argumentsList[0];
                    if (param === 37445 && window.__veil_profile?.webgl_vendor) {
                        return window.__veil_profile.webgl_vendor;
                    }
                    if (param === 37446 && window.__veil_profile?.webgl_renderer) {
                        return window.__veil_profile.webgl_renderer;
                    }
                    return Reflect.apply(target, thisArg, argumentsList);
                }
            });

            Object.defineProperty(WebGL2RenderingContext.prototype, 'getParameter', {
                value: getParameterProxy2,
                writable: true,
                configurable: true
            });
        }
    } catch(e) {}
})();
