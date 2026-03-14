import { parentPort, workerData } from 'worker_threads';
import fs from 'fs/promises';

const { filePath, start, end } = workerData;

const run = async () => {
    const fileHandle = await fs.open(filePath, 'r');
    
    try {
        const bufferSize = 64 * 1024;
        const buffer = Buffer.alloc(bufferSize);
        let position = start;
        let leftoverBuffer = Buffer.alloc(0);
        let done = false;

        // Skip partial line at start if not at beginning of file
        if (position > 0) {
            let foundNewline = false;
            while (!foundNewline) {
                const bytesRead = await fileHandle.read(buffer, 0, bufferSize, position); // Use fileHandle.read() with position
                if (bytesRead.bytesRead === 0) {
                    done = true; // EOF before finding newline
                    break;
                }

                for (let i = 0; i < bytesRead.bytesRead; i++) {
                    if (buffer[i] === 10) { // \n
                        position += i + 1; // Move passed the newline
                        foundNewline = true;
                        break;
                    }
                }
                
                if (!foundNewline) {
                    position += bytesRead.bytesRead;
                }
            }
        }

        const stats = {
            total: 0,
            levels: {},
            status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
            paths: {},
            responseTimeSum: 0
        };

        while (!done) {
            // Check if we passed the end boundary for starting a new line
            if (position > end) {
                break;
            }

            const { bytesRead } = await fileHandle.read(buffer, 0, bufferSize, position);
            if (bytesRead === 0) break;

            let chunkOffset = 0;
            
            for (let i = 0; i < bytesRead; i++) {
                if (buffer[i] === 10) { // Newline found
                    // Calculate start of this line
                    const lineStartPos = position + chunkOffset;
                    
                    if (lineStartPos > end) {
                        done = true;
                        break;
                    }

                    // Extract line
                    const lineContent = Buffer.concat([leftoverBuffer, buffer.subarray(chunkOffset, i)]);
                    leftoverBuffer = Buffer.alloc(0); // Clear leftover
                    
                    processLine(lineContent.toString(), stats);
                    
                    chunkOffset = i + 1;
                }
            }
            
            if (!done) {
                 leftoverBuffer = Buffer.concat([leftoverBuffer, buffer.subarray(chunkOffset, bytesRead)]);
                 position += bytesRead;
            }
        }
        
        // Handle last line if file ends without newline
        // But only if it started within our range.
        if (!done && leftoverBuffer.length > 0 && position <= end) { // Wait, position tracks end of read.
             // Usually logs end with newline. If not, the last partial line starts at `position - leftover.length`.
             // We need to check if that `start` <= end.
             // Actually, `chunkOffset` was last newline + 1.
             // The start of `leftoverBuffer` in file is `position - (bytesRead - chunkOffset)`.
             // Wait, position was incremented by bytesRead at end of loop.
             // So start of leftover is `position - leftoverBuffer.length` ? No, because of concatenation.
             
             // Simplified: we stop only if `lineStartPos > end`.
             // If we reach EOF and have `leftoverBuffer`, it means last line didn't end with \n.
             // Did it start <= end? 
             // Logic above checks `lineStartPos > end` for every line.
             // For the EOF line, we don't have a `lineStartPos` check inside the loop because no `\n`.
             // But we only read chunks starting at `position`.
             // If `position` was <= end when we started reading this chunk, then any line starting in it *might* be ours.
             // But `position` updates. 
             // Correct logic: we stop the loop when `position > end` (before reading).
             // If we read a chunk, and inside it find a line start <= end, we process.
             // If we reach EOF, the `leftover` started at some point.
             // If we are the last worker (or covered until EOF), we should process it.
             // But `start` <= `end` ensures we cover everything?
             // Actually, `end` is typically `fileSize`.
             // So for last worker, `end` == `fileSize`.
             // `lineStartPos` will be <= `fileSize`.
             // So we should process leftover if we hit EOF.
             if (leftoverBuffer.length > 0) {
                 processLine(leftoverBuffer.toString(), stats);
             }
        }

        parentPort.postMessage(stats);

    } catch (err) {
        throw err;
    } finally {
        await fileHandle.close();
    }
};

const processLine = (line, stats) => {
    if (!line.trim()) return;
    
    // Format: <isoTimestamp> <level> <service> <statusCode> <responseTimeMs> <method> <path>
    const parts = line.trim().split(/\s+/);
    if (parts.length < 7) return;

    const level = parts[1];
    const statusCode = parts[3];
    const responseTime = parseInt(parts[4]) || 0;
    const pathUrl = parts[6];

    stats.total += 1;
    stats.responseTimeSum += responseTime;
    
    stats.levels[level] = (stats.levels[level] || 0) + 1;
    
    const statusDigit = statusCode[0];
    if (statusDigit >= '2' && statusDigit <= '5') {
        const key = `${statusDigit}xx`;
        stats.status[key] = (stats.status[key] || 0) + 1;
    }

    stats.paths[pathUrl] = (stats.paths[pathUrl] || 0) + 1;
};

run();

