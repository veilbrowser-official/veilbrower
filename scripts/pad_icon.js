const sharp = require('sharp');
const fs = require('fs');

async function optimizeIcon() {
  const iconPath = './src-tauri/icons/icon.png';
  const backupPath = './src-tauri/icons/icon_backup.png';
  
  if (!fs.existsSync(iconPath)) {
    console.error("Icon not found at", iconPath);
    return;
  }
  
  // Backup the original
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(iconPath, backupPath);
  }

  // A standard macOS Dock icon usually shouldn't touch the edges of the 1024 canvas.
  // Resizing the image to ~80% ensures the icon behaves correctly relative to other apps.
  const TARGET_SIZE = 1024;
  const INNER_FITTING_SIZE = Math.floor(TARGET_SIZE * 0.85); // 870x870

  console.log("Adding padding to icon...");
  
  await sharp(backupPath)
    .resize({
      width: INNER_FITTING_SIZE,
      height: INNER_FITTING_SIZE,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent
    })
    .extend({
      top: Math.floor((TARGET_SIZE - INNER_FITTING_SIZE) / 2),
      bottom: Math.ceil((TARGET_SIZE - INNER_FITTING_SIZE) / 2),
      left: Math.floor((TARGET_SIZE - INNER_FITTING_SIZE) / 2),
      right: Math.ceil((TARGET_SIZE - INNER_FITTING_SIZE) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toFile(iconPath);
    
  console.log("Icon padded and saved successfully to", iconPath);
}

optimizeIcon();
