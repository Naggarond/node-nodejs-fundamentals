import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.join(__dirname, '../../workspace');

const findByExt = async () => {
    try {
        await fs.access(workspacePath);
    } catch {
        throw new Error('FS operation failed');
    }

    const args = process.argv.slice(2);
    let ext = '.txt';
    const extIndex = args.indexOf('--ext');
    if (extIndex !== -1 && args[extIndex + 1]) {
        ext = args[extIndex + 1];
    }
    
    if (!ext.startsWith('.')) ext = '.' + ext;

    const files = [];
    const scan = async (dir, relativeDir = '') => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const relativePath = relativeDir ? path.join(relativeDir, item.name) : item.name;
            const absolutePath = path.join(dir, item.name);
            if (item.isDirectory()) {
                await scan(absolutePath, relativePath);
            } else if (item.isFile()) {
                 if (path.extname(item.name) === ext) {
                     files.push(relativePath);
                 }
            }
        }
    };

    await scan(workspacePath);
    
    files.sort();
    if (files.length > 0) {
        console.log(files.join('\n'));
    }
};

await findByExt();
