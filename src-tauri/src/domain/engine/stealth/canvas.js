// L1.5 Stealth Payload: Canvas Noise Injection
// Uses dynamic noise shifting based on __veil_profile session seed
// Intercepts toDataURL and getImageData cleanly without destructive iteration loops.

(function() {
    try {
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const originalPutImageData = CanvasRenderingContext2D.prototype.putImageData;

        const applyNoiseToImageData = (imageData, seed, startX = 0, startY = 0) => {
            const width = imageData.width;
            const height = imageData.height;
            for (let i = 0; i < height; i += 5) {
                for (let j = 0; j < width; j += 5) {
                    const absX = startX + j;
                    const absY = startY + i;
                    const idx = (i * width + j) * 4;
                    // Deterministic salt based on absolute coordinates
                    let salt = (seed * (absY * 10000 + absX)) % 2;
                    let deviation = Math.sin(salt) > 0 ? 1 : -1;
                    imageData.data[idx] = Math.min(255, Math.max(0, imageData.data[idx] + deviation));
                }
            }
        };

        const toDataUrlProxy = new Proxy(HTMLCanvasElement.prototype.toDataURL, {
            apply: function(target, thisArg, argumentsList) {
                try {
                    const ctx = thisArg.getContext('2d');
                    if (ctx) {
                        const width = thisArg.width;
                        const height = thisArg.height;
                        if (width > 0 && height > 0) {
                            // Backup original
                            const originalImageData = Reflect.apply(originalGetImageData, ctx, [0, 0, width, height]);
                            
                            // Create noisy duplicate
                            const noisyImageData = Reflect.apply(originalGetImageData, ctx, [0, 0, width, height]);
                            const seed = window.__veil_profile?.canvas_noise_seed || 0.0001;
                            applyNoiseToImageData(noisyImageData, seed, 0, 0);
                            
                            // Temporarily put noisy data to generate URL
                            Reflect.apply(originalPutImageData, ctx, [noisyImageData, 0, 0]);
                            const result = Reflect.apply(target, thisArg, argumentsList);
                            
                            // Restore original
                            Reflect.apply(originalPutImageData, ctx, [originalImageData, 0, 0]);
                            
                            return result;
                        }
                    }
                } catch(e) {}
                
                return Reflect.apply(target, thisArg, argumentsList);
            }
        });

        Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
            value: toDataUrlProxy,
            writable: true,
            configurable: true
        });

        const getImageDataProxy = new Proxy(CanvasRenderingContext2D.prototype.getImageData, {
            apply: function(target, thisArg, argumentsList) {
                const imageData = Reflect.apply(target, thisArg, argumentsList);
                try {
                    const seed = window.__veil_profile?.canvas_noise_seed || 0.0001;
                    const startX = argumentsList[0] || 0;
                    const startY = argumentsList[1] || 0;
                    applyNoiseToImageData(imageData, seed, startX, startY);
                } catch(e) {}
                return imageData;
            }
        });
        
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'getImageData', {
            value: getImageDataProxy,
            writable: true,
            configurable: true
        });

    } catch(e) {}
})();
