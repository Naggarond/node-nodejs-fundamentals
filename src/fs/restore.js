import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotPath = path.join(__dirname, '../../snapshot.json');
const restorePath = path.join(__dirname, '../../workspace_restored');

const restore = async () => {
    let content;
    try {
        content = await fs.readFile(snapshotPath, 'utf8');
    } catch {
        throw new Error('FS operation failed');
    }

    try {
        await fs.mkdir(restorePath);
    } catch {
        throw new Error('FS operation failed');
    }

    const { entries } = JSON.parse(content);

    for (const entry of entries) {
        const fullPath = path.join(restorePath, entry.path);
        if (entry.type === 'directory') {
            await fs.mkdir(fullPath, { recursive: true });
        } else {
            const dir = path.dirname(fullPath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(fullPath, Buffer.from(entry.content, 'base64'));
        }
    }
};

await restore();
