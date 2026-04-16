const { Jimp } = require('jimp');
const path = require('path');

async function createDarkLogo() {
    try {
        const imagePath = path.join(__dirname, 'public', 'cupula-logo.png');
        console.log("Loading image...", imagePath);
        
        const image = await Jimp.read(imagePath);
        
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            const a = this.bitmap.data[idx + 3];

            // Only process non-transparent pixels
            if (a > 0) {
                const max = Math.max(r, g, b);
                
                // If it's a very dark pixel (black text or black arrow)
                // Black usually has r, g, b all under 50.
                if (max < 60) {
                    // Turn it white!
                    this.bitmap.data[idx + 0] = 255; // R
                    this.bitmap.data[idx + 1] = 255; // G
                    this.bitmap.data[idx + 2] = 255; // B
                }
            }
        });

        const outputPath = path.join(__dirname, 'public', 'cupula-logo-dark.png');
        await image.write(outputPath);
        
        console.log("Dark mode logo created successfully as cupula-logo-dark.png!");
    } catch (e) {
        console.error("Error processing image:", e);
    }
}

createDarkLogo();
