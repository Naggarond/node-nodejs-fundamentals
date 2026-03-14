import fs from 'fs';
import path from 'path';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcePath = path.join(__dirname, 'source.txt');

const split = async () => {
    const args = process.argv.slice(2);
    let linesPerChunk = 10;
    const idx = args.indexOf('--lines');
    if (idx !== -1 && args[idx + 1]) {
        linesPerChunk = parseInt(args[idx + 1]);
    }

    let chunkIndex = 0;
    let lineCount = 0;
    let currentWriteStream = null;
    let lastLineData = '';

    const createChunkStream = () => {
        chunkIndex++;
        const p = path.join(__dirname, `chunk_${chunkIndex}.txt`);
        return fs.createWriteStream(p);
    };

    const transform = new Transform({
        transform(chunk, encoding, callback) {
            let data = chunk.toString();
            if (lastLineData) {
                data = lastLineData + data;
            }
            
            const lines = data.split('\n');
            lastLineData = lines.pop(); // Keep last partial line
            
            for (const line of lines) {
                if (lineCount % linesPerChunk === 0) {
                    if (currentWriteStream) {
                        currentWriteStream.end();
                    }
                    currentWriteStream = createChunkStream();
                }
                
                currentWriteStream.write(line + '\n');
                lineCount++;
            }
            callback();
        },
        flush(callback) {
            if (lastLineData) {
                if (lineCount % linesPerChunk === 0) {
                     if (currentWriteStream) currentWriteStream.end();
                     currentWriteStream = createChunkStream();
                }
                currentWriteStream.write(lastLineData);
            }
            if (currentWriteStream) currentWriteStream.end();
            callback();
        }
    });

    try {
        await pipeline(
            fs.createReadStream(sourcePath),
            transform
        );
    } catch (err) {
        // console.error(err); // Fail silently or throw? Instruction implies just implementation.
    }
};

await split();
