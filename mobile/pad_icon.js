const Jimp = require('jimp');
const path = require('path');

async function main() {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const outIconPath = path.join(__dirname, 'assets', 'icon_padded.png');
    const outSplashPath = path.join(__dirname, 'assets', 'splash-icon.png');
    
    // Read the current edge-to-edge icon
    const image = await Jimp.read(iconPath);
    
    // Scale the image down to 600px (fitting within a 1024 canvas)
    image.scaleToFit(600, 600);
    
    // Create a new 1024x1024 transparent canvas
    const background = new Jimp(1024, 1024, 0x00000000);
    
    // Calculate center coordinates
    const x = (1024 - image.bitmap.width) / 2;
    const y = (1024 - image.bitmap.height) / 2;
    
    // Composite the image onto the canvas
    background.composite(image, x, y);
    
    // Save to the output files
    await background.writeAsync(iconPath);
    await background.writeAsync(outSplashPath);
    console.log('Icons successfully padded and saved.');
}

main().catch(console.error);
