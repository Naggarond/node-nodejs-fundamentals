import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { createBrotliDecompress } from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspacePath = path.join(__dirname, '../../workspace');
const compressedPath = path.join(workspacePath, 'compressed/archive.br');
const decompressedPath = path.join(workspacePath, 'decompressed');

const decompressDir = async () => {
    try {
        await fs.access(compressedPath);
    } catch {
        throw new Error('FS operation failed');
    }

    await fs.mkdir(decompressedPath, { recursive: true });

    const input = createReadStream(compressedPath);
    const brotli = createBrotliDecompress();
    input.pipe(brotli);

    let buffer = Buffer.alloc(0);
    let state = 'header'; // header, content
    let currentEntry = null;

    const processBuffer = async () => {
        while (true) {
            if (state === 'header') {
                if (buffer.length < 3) return; 
                
                const type = buffer.readUInt8(0) === 1 ? 'file' : 'dir';
                const pathLen = buffer.readUInt16BE(1);
                
                if (buffer.length < 3 + pathLen + (type === 'file' ? 8 : 0)) return;
                
                let offset = 3;
                const pathStr = buffer.subarray(offset, offset + pathLen).toString();
                offset += pathLen;
                
                let size = 0n;
                if (type === 'file') {
                    size = buffer.readBigUInt64BE(offset);
                    offset += 8;
                }
                
                buffer = buffer.subarray(offset);
                
                const fullPath = path.join(decompressedPath, pathStr);
                
                if (type === 'dir') {
                    await fs.mkdir(fullPath, { recursive: true });
                } else {
                    await fs.mkdir(path.dirname(fullPath), { recursive: true });
                    currentEntry = {
                        path: fullPath,
                        remaining: size,
                        stream: createWriteStream(fullPath)
                    };
                    state = 'content';
                }
            } else if (state === 'content') {
               if (buffer.length === 0 && currentEntry.remaining > 0n) return;
               
               const size = BigInt(buffer.length);
               const toWrite = size > currentEntry.remaining ? currentEntry.remaining : size;
               
               const chunk = buffer.subarray(0, Number(toWrite));
               buffer = buffer.subarray(Number(toWrite));
               
               const canWrite = currentEntry.stream.write(chunk);
               if (!canWrite) {
                   await new Promise(resolve => currentEntry.stream.once('drain', resolve));
               }
               
               currentEntry.remaining -= toWrite;
               
               if (currentEntry.remaining === 0n) {
                   await new Promise(fulfill => currentEntry.stream.end(fulfill));
                   state = 'header';
                   currentEntry = null;
               }
            }
        }
    };
    
    for await (const chunk of brotli) {
        buffer = Buffer.concat([buffer, chunk]);
        await processBuffer();
    }
};

await decompressDir();
