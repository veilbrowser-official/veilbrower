const sharp = require('sharp');

async function recolorToVibrantPurple() {
    try {
        console.log("Analyzing original icon...");
        const { data, info } = await sharp('./src-tauri/icons/icon_backup.png')
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
            
        // Target color matches the splash screen: #a855f7 or #9333ea 
        // Let's use a very vibrant solid neon purple: rgb(168, 85, 247) 
        const targetR = 168;
        const targetG = 85;
        const targetB = 247;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];
            
            // Calculate perceived luminance to detect the Fox vs Background
            const lum = 0.2126*r + 0.7152*g + 0.0722*b;
            
            const bgThreshold = 40; 
            const fgThreshold = 75;
            
            let alpha = 0;
            if (lum > fgThreshold) {
                alpha = 255;
            } else if (lum <= bgThreshold) {
                alpha = 0;
            } else {
                // Smooth anti-aliasing blend for borders
                alpha = Math.floor(((lum - bgThreshold) / (fgThreshold - bgThreshold)) * 255);
            }
            
            data[i+3] = alpha; // Set transparency
            
            // If the pixel is part of the fox (not background), forcefully paint it vibrant purple
            if (alpha > 0) {
                // If it's a very bright part (like the eyes), keep it closer to white
                if (lum > 150) {
                    data[i] = 255;
                    data[i+1] = 255;
                    data[i+2] = 255;
                } else {
                    // Force the neon purple color
                    data[i] = targetR;
                    data[i+1] = targetG;
                    data[i+2] = targetB;
                }
            }
        }
        
        console.log("Saving recolored vibrant logo...");
        await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
            .trim() 
            .png({ quality: 100 })
            .toFile('./frontend/public/logo-vibrant.png');
            
        console.log("Success! logo-vibrant.png created.");
    } catch (e) {
        console.error("Error processing logo:", e);
    }
}

recolorToVibrantPurple();
