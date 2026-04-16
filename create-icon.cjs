const { Jimp } = require('jimp');
const path = require('path');

async function createIcon() {
    try {
        const lightImg = await Jimp.read(path.join(__dirname, 'public', 'cupula-logo.png'));
        const darkImg = await Jimp.read(path.join(__dirname, 'public', 'cupula-logo-dark.png'));
        
        // Let's crop tighter to ensure no text remains at the bottom.
        // I will cut 30 more pixels off the bottom by setting height to 220.
        // Also a tiny bit from the left just in case (x: 10)
        lightImg.crop({x: 10, y: 0, w: 350, h: 220});
        darkImg.crop({x: 10, y: 0, w: 350, h: 220});
        
        await lightImg.write(path.join(__dirname, 'public', 'cupula-icon.png'));
        await darkImg.write(path.join(__dirname, 'public', 'cupula-icon-dark.png'));
        
        console.log("Ultra strict icons created successfully!");
    } catch (e) {
        console.error("Error:", e);
    }
}

createIcon();
