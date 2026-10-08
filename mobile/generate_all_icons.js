const Jimp = require('jimp');
const path = require('path');

async function processIcons() {
    const publicDir = path.join(__dirname, '..', 'public');
    const assetsDir = path.join(__dirname, 'assets');

    const sourceIconPath = path.join(publicDir, 'cupula-icon.png');
    const sourceLogoPath = path.join(publicDir, 'cupula-logo.png');

    console.log('Reading source images...');
    const iconImage = await Jimp.read(sourceIconPath);
    const logoImage = await Jimp.read(sourceLogoPath);

    // 1. Create standard app icon (1024x1024)
    // The user complained it was not centered and missing black colors
    // We will place it exactly in the center of a 1024x1024 white background
    console.log('Generating main icon...');
    const mainIconBg = new Jimp(1024, 1024, '#FFFFFF');
    // Scale source icon down so it fits well within the 1024 canvas. 
    // Android adaptive icon requires the important part to be within the inner 66% (which is about 675px).
    // Let's scale to 600px max dimension
    const scaleFactorIcon = 600 / Math.max(iconImage.bitmap.width, iconImage.bitmap.height);
    const newIconWidth = Math.round(iconImage.bitmap.width * scaleFactorIcon);
    const newIconHeight = Math.round(iconImage.bitmap.height * scaleFactorIcon);
    
    // We will clone the original so we don't modify the source object for subsequent steps
    const resizedIcon = iconImage.clone().resize(newIconWidth, newIconHeight, Jimp.RESIZE_BICUBIC);
    
    // Calculate center. 
    // If there's visual weight imbalance, we could offset it, but geometric center is best first
    const iconX = Math.round((1024 - newIconWidth) / 2);
    const iconY = Math.round((1024 - newIconHeight) / 2);
    
    mainIconBg.composite(resizedIcon, iconX, iconY);
    await mainIconBg.writeAsync(path.join(assetsDir, 'icon.png'));
    await mainIconBg.writeAsync(path.join(assetsDir, 'android-icon-foreground.png'));
    console.log('Saved icon.png and android-icon-foreground.png');

    // 2. Create splash icon
    // The user said "C" and "S" were cut off. So we pad the logo significantly.
    console.log('Generating splash icon...');
    // We make a transparent canvas that is wider than the logo to add horizontal margins.
    // Let's add 25% padding on each side.
    const logoWidth = logoImage.bitmap.width;
    const logoHeight = logoImage.bitmap.height;
    
    // Create a square splash image that Expo can easily "contain".
    const splashSize = Math.max(logoWidth * 1.5, logoHeight * 1.5, 1024); 
    const splashBg = new Jimp(splashSize, splashSize, 0x00000000); // transparent
    
    const splashX = Math.round((splashSize - logoWidth) / 2);
    const splashY = Math.round((splashSize - logoHeight) / 2);
    
    splashBg.composite(logoImage, splashX, splashY);
    await splashBg.writeAsync(path.join(assetsDir, 'splash-icon.png'));
    console.log('Saved splash-icon.png');

    // 3. Create notification icon (must be all white on transparent)
    console.log('Generating notification icon...');
    const notifSize = 96;
    // Resize original icon to fit in 96x96
    const notifImage = iconImage.clone().scaleToFit(notifSize, notifSize, Jimp.RESIZE_BICUBIC);
    
    // Make every pixel that has alpha > 0 solid white
    notifImage.scan(0, 0, notifImage.bitmap.width, notifImage.bitmap.height, function(x, y, idx) {
        const alpha = this.bitmap.data[idx + 3];
        if (alpha > 50) { // arbitrary threshold to avoid faint aliased edges
            this.bitmap.data[idx + 0] = 255; // R
            this.bitmap.data[idx + 1] = 255; // G
            this.bitmap.data[idx + 2] = 255; // B
            this.bitmap.data[idx + 3] = alpha; // Keep original alpha for smooth edges
        } else {
            this.bitmap.data[idx + 3] = 0; // completely transparent
        }
    });

    const notifCanvas = new Jimp(96, 96, 0x00000000);
    const notifX = Math.round((96 - notifImage.bitmap.width) / 2);
    const notifY = Math.round((96 - notifImage.bitmap.height) / 2);
    notifCanvas.composite(notifImage, notifX, notifY);

    await notifCanvas.writeAsync(path.join(assetsDir, 'notification-icon.png'));
    console.log('Saved notification-icon.png');
}

processIcons().catch(console.error);
