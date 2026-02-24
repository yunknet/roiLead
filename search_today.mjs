import fs from 'fs';
import path from 'path';

const historyDir = 'C:\\Users\\netso\\AppData\\Roaming\\Code\\User\\History';

function search() {
    const folders = fs.readdirSync(historyDir);
    const results = [];
    for (const folder of folders) {
        const p = path.join(historyDir, folder);
        const stat = fs.statSync(p);
        if (stat.mtime > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
            const entriesPath = path.join(p, 'entries.json');
            if (fs.existsSync(entriesPath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
                    results.push({
                        folder,
                        resource: data.resource,
                        entries: data.entries,
                        mtime: stat.mtime
                    });
                } catch (e) { }
            }
        }
    }
    results.sort((a, b) => b.mtime - a.mtime);
    results.forEach(r => {
        console.log(`[${r.mtime.toLocaleString()}] Folder: ${r.folder} | Res: ${r.resource}`);
    });
}
search();
