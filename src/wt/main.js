import fs from 'fs/promises';
import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.join(__dirname, 'worker.js');
const dataPath = path.join(__dirname, 'data.json');

const main = async () => {
    let content;
    try {
        content = await fs.readFile(dataPath, 'utf8');
    } catch {
        console.error('Data file not found');
        return;
    }
    
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
        console.error('Data invalid');
        return;
    }

    const cpuCount = os.cpus().length;
    const chunkSize = Math.ceil(data.length / cpuCount);
    const chunks = [];
    
    for (let i = 0; i < cpuCount; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = data.slice(start, end);
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
    }
    
    if (chunks.length === 0) {
        console.log([]);
        return;
    }
    
    const workers = chunks.map(chunk => {
        return new Promise((resolve, reject) => {
            const worker = new Worker(workerPath);
            worker.on('message', (msg) => {
                resolve(msg);
                worker.terminate();
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                 if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
            worker.postMessage(chunk);
        });
    });
    
    const sortedChunks = await Promise.all(workers);
    
    const result = [];
    const heads = new Array(sortedChunks.length).fill(0);
    
    while (true) {
        let minVal = Infinity;
        let minIdx = -1;
        
        for (let i = 0; i < sortedChunks.length; i++) {
            if (heads[i] < sortedChunks[i].length) {
                if (sortedChunks[i][heads[i]] < minVal) {
                    minVal = sortedChunks[i][heads[i]];
                    minIdx = i;
                }
            }
        }
        
        if (minIdx === -1) break;
        
        result.push(minVal);
        heads[minIdx]++;
    }
    
    console.log(result);
};

await main();
