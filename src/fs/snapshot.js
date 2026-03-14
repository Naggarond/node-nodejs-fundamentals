import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.join(__dirname, '../../workspace');
const snapshotPath = path.join(__dirname, '../../snapshot.json');

const snapshot = async () => {
    try {
        await fs.access(workspacePath);
    } catch {
        throw new Error('FS operation failed');
    }

    const entries = [];

    const scan = async (dir, relativeDir = '') => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const relativePath = relativeDir ? path.join(relativeDir, item.name) : item.name;
            const absolutePath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                entries.push({ path: relativePath, type: 'directory' });
                await scan(absolutePath, relativePath);
            } else if (item.isFile()) {
                const stat = await fs.stat(absolutePath);
                const content = await fs.readFile(absolutePath);
                entries.push({
                    path: relativePath,
                    type: 'file',
                    size: stat.size,
                    content: content.toString('base64')
                });
            }
        }
    };

    await scan(workspacePath);

    const result = {
        rootPath: workspacePath,
        entries
    };

    await fs.writeFile(snapshotPath, JSON.stringify(result, null, 2));
};

await snapshot();
