import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const checksumsPath = path.join(__dirname, 'checksums.json');

const verify = async () => {
    let content;
    try {
        content = await fs.readFile(checksumsPath, 'utf8');
    } catch {
        throw new Error('FS operation failed');
    }

    const expected = JSON.parse(content);

    for (const [filename, hash] of Object.entries(expected)) {
        const filePath = path.join(__dirname, filename);
        const sha256 = createHash('sha256');

        try {
            await pipeline(
                createReadStream(filePath),
                sha256
            );
            const actual = sha256.digest('hex');
            const status = actual === hash ? 'OK' : 'FAIL';
            console.log(`${filename} — ${status}`);
        } catch (err) {
            console.log(`${filename} — FAIL`);
        }
    }
};

await verify();
