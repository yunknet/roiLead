const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

async function removeFakeTrans() {
    try {
        const imagePath = path.join(__dirname, 'public', 'cupula-logo.png');
        console.log("Loading image...", imagePath);
        
        // Jimp v1+ uses Jimp.read directly
        const image = await Jimp.read(imagePath);
        
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const diff = max - min;
            
            // If the pixel is mostly gray/white (diff < 40) and light enough
            if (max > 120 && diff < 40) {
                // Determine if it's the specific pattern logic
                // Set alpha to 0 completely
                this.bitmap.data[idx + 3] = 0;
            }
        });

        const outputPath = path.join(__dirname, 'public', 'cupula-logo-fixed.png');
        await image.write(outputPath);
        
        // replace original
        fs.renameSync(outputPath, imagePath);
        console.log("Background removed successfully!");
    } catch (e) {
        console.error("Error processing image:", e);
    }
}

removeFakeTrans();
