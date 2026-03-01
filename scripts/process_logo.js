const sharp = require('sharp');

async function extractTransparentLogo() {
    try {
        console.log("Analyzing original icon...");
        const { data, info } = await sharp('./src-tauri/icons/icon_backup.png')
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
            
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Calculate perceived luminance
            const lum = 0.2126*r + 0.7152*g + 0.0722*b;
            
            // Current background is a dark squircle (likely lum < 35)
            // The fox lines are a light purple (likely lum > 80)
            const bgThreshold = 40; 
            const fgThreshold = 80;
            
            let alpha = 0;
            if (lum > fgThreshold) {
                alpha = 255;
            } else if (lum <= bgThreshold) {
                alpha = 0;
            } else {
                // Smooth anti-aliasing blend for borders
                alpha = Math.floor(((lum - bgThreshold) / (fgThreshold - bgThreshold)) * 255);
            }
            
            data[i+3] = alpha;
            
            // Deeply brighten the fox outline so it pops out beautifully
            if (alpha > 0) {
                // Boost RGB channels to extreme neon / near-white purple
                data[i] = Math.min(255, r * 2.5 + 50);
                data[i+1] = Math.min(255, g * 2.5 + 50);
                data[i+2] = Math.min(255, b * 2.5 + 50);
            }
        }
        
        console.log("Saving transparent bright logo...");
        await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
            .trim() // Crop out all the empty outer space
            .png({ quality: 100 })
            .toFile('./frontend/public/logo-transparent.png');
            
        console.log("Success! logo-transparent.png created.");
    } catch (e) {
        console.error("Error processing logo:", e);
    }
}

extractTransparentLogo();
