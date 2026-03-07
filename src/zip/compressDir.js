import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { createBrotliCompress } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.join(__dirname, '../../workspace');
const toCompressPath = path.join(workspacePath, 'toCompress');
const compressedPath = path.join(workspacePath, 'compressed');
const archivePath = path.join(compressedPath, 'archive.br');

const compressDir = async () => {
    try {
        await fs.access(toCompressPath);
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
                entries.push({ type: 'dir', path: relativePath });
                await scan(absolutePath, relativePath);
            } else {
                const stat = await fs.stat(absolutePath);
                entries.push({ type: 'file', path: relativePath, size: stat.size, absPath: absolutePath });
            }
        }
    };
    await scan(toCompressPath);

    await fs.mkdir(compressedPath, { recursive: true });

    const output = createWriteStream(archivePath);
    const brotli = createBrotliCompress();
    brotli.pipe(output);

    for (const entry of entries) {
        const pathBuf = Buffer.from(entry.path);
        // Header: Type(1) + PathLength(2) + Path + [Size(8)]
        const headerLen = 1 + 2 + pathBuf.length + (entry.type === 'file' ? 8 : 0);
        const header = Buffer.alloc(headerLen);
        
        let offset = 0;
        header.writeUInt8(entry.type === 'file' ? 1 : 0, offset++);
        header.writeUInt16BE(pathBuf.length, offset); offset += 2;
        pathBuf.copy(header, offset); offset += pathBuf.length;
        if (entry.type === 'file') {
            header.writeBigUInt64BE(BigInt(entry.size), offset);
        }

        if (!brotli.write(header)) {
            await new Promise(resolve => brotli.once('drain', resolve));
        }

        if (entry.type === 'file') {
            const input = createReadStream(entry.absPath);
            await new Promise((resolve, reject) => {
                input.on('data', chunk => {
                    if (!brotli.write(chunk)) {
                        input.pause();
                        brotli.once('drain', () => input.resume());
                    }
                });
                input.on('end', resolve);
                input.on('error', reject);
            });
        }
    }

    brotli.end();
    await new Promise((resolve, reject) => {
        output.on('finish', resolve);
        output.on('error', reject);
    });
};

await compressDir();
