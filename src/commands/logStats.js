import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import os from 'os';

export const logStats = async (currentDir, argsList, args) => {
    if (!args.input || !args.output) {
        throw new Error('Invalid input');
    }

    const inputPath = path.resolve(currentDir, args.input);
    const outputPath = path.resolve(currentDir, args.output);

    let stats;
    try {
        stats = await fs.promises.stat(inputPath);
    } catch {
        throw new Error('Operation failed');
    }

    const size = stats.size;
    const numCPUs = os.cpus().length;
    const chunkSize = Math.floor(size / numCPUs);
    
    // Create workers
    const promises = [];
    const workerPath = path.join(path.dirname(import.meta.url).replace('file://', ''), '../workers/logWorker.js'); 
    // Trick to get absolute path in ES modules if __dirname not available, 
    // but better to use path resolution from current file url.
    // import.meta.url gives file:///.../src/commands/logStats.js
    // So ../workers/logWorker.js resolves correctly.
    // Using simple relative path might fail depending on how it's executed.
    // Let's use `new URL('../workers/logWorker.js', import.meta.url)`
    
    const workerFile = new URL('../workers/logWorker.js', import.meta.url);

    for (let i = 0; i < numCPUs; i++) {
        const start = i * chunkSize;
        const end = (i === numCPUs - 1) ? size - 1 : (i + 1) * chunkSize - 1;
        
        promises.push(new Promise((resolve, reject) => {
            const worker = new Worker(workerFile, {
                workerData: { filePath: inputPath, start, end }
            });
            worker.on('message', resolve);
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
            });
        }));
    }

    try {
        const results = await Promise.all(promises);
        
        // Merge results
        const finalStats = {
            total: 0,
            levels: {},
            status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
            paths: {}, // Temporary map
            responseTimeSum: 0
        };

        results.forEach(res => {
            finalStats.total += res.total;
            finalStats.responseTimeSum += res.responseTimeSum;

            // Merge levels
            for (const [level, count] of Object.entries(res.levels)) {
                finalStats.levels[level] = (finalStats.levels[level] || 0) + count;
            }

            // Merge status
            for (const [s, count] of Object.entries(res.status)) {
                finalStats.status[s] = (finalStats.status[s] || 0) + count;
            }

            // Merge paths
            for (const [p, count] of Object.entries(res.paths)) {
                finalStats.paths[p] = (finalStats.paths[p] || 0) + count;
            }
        });

        // Compute avg response time
        const avgResponseTimeMs = finalStats.total > 0 ? (finalStats.responseTimeSum / finalStats.total) : 0;

        // Compute topPaths
        const topPaths = Object.entries(finalStats.paths)
            .map(([path, count]) => ({ path, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Ask didn't specify number, example showed 2. Let's do 5 or all?
            // "topPaths": [...]
            // Let's assume top 5 or just list? The example has 2. I'll include all if small, or top 5.
            
        const output = {
            total: finalStats.total,
            levels: finalStats.levels,
            status: finalStats.status,
            topPaths: topPaths,
            avgResponseTimeMs: parseFloat(avgResponseTimeMs.toFixed(2))
        };

        await fs.promises.writeFile(outputPath, JSON.stringify(output, null, 2));
        console.log(`Stats written to ${outputPath}`);
    } catch (err) {
        throw new Error('Operation failed');
    }
};
