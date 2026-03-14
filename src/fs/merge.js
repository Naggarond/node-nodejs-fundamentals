import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const partsPath = path.join(__dirname, '../../workspace/parts');
const mergedPath = path.join(__dirname, '../../workspace/merged.txt');

const merge = async () => {
    try {
        await fs.access(partsPath);
    } catch {
        throw new Error('FS operation failed');
    }

    const args = process.argv.slice(2);
    const filesIndex = args.indexOf('--files');
    
    let files = [];
    
    if (filesIndex !== -1 && args[filesIndex + 1]) {
        files = args[filesIndex + 1].split(',').map(f => f.trim());
        for (const file of files) {
            try {
                await fs.access(path.join(partsPath, file));
            } catch {
                throw new Error('FS operation failed');
            }
        }
    } else {
        const items = await fs.readdir(partsPath);
        files = items.filter(f => path.extname(f) === '.txt').sort();
        if (files.length === 0) {
            throw new Error('FS operation failed');
        }
    }

    const writeStream = createWriteStream(mergedPath);
    
    for (const file of files) {
         await new Promise((resolve, reject) => {
             const readStream = createReadStream(path.join(partsPath, file));
             readStream.pipe(writeStream, { end: false });
             readStream.on('end', resolve);
             readStream.on('error', reject);
         });
    }
    writeStream.end();
};

await merge();
