import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

const filter = async () => {
    const args = process.argv.slice(2);
    let pattern = '';
    const idx = args.indexOf('--pattern');
    if (idx !== -1 && args[idx + 1]) {
        pattern = args[idx + 1];
    }

    let lastLineData = '';

    const transform = new Transform({
        transform(chunk, encoding, callback) {
            let data = chunk.toString();
            if (lastLineData) {
                data = lastLineData + data;
            }
            
            const lines = data.split('\n');
            lastLineData = lines.pop(); // save potentially incomplete line
            
            for (const line of lines) {
                if (line.includes(pattern)) {
                    this.push(line + '\n');
                }
            }
            callback();
        },
        flush(callback) {
            if (lastLineData) {
                if (lastLineData.includes(pattern)) {
                    this.push(lastLineData + '\n');
                }
            }
            callback();
        }
    });

    await pipeline(process.stdin, transform, process.stdout);
};

filter();
