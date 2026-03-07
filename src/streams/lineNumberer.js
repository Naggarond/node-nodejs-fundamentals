import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

const lineNumberer = async () => {
    let lineCount = 0;
    
    const transform = new Transform({
        transform(chunk, encoding, callback) {
            let data = chunk.toString();
            if (this._lastLineData) {
                data = this._lastLineData + data;
            }
            
            const lines = data.split('\n');
            this._lastLineData = lines.pop();
            
            for (const line of lines) {
                lineCount++;
                this.push(`${lineCount} | ${line}\n`);
            }
            callback();
        },
        flush(callback) {
            if (this._lastLineData) {
                lineCount++;
                this.push(`${lineCount} | ${this._lastLineData}`);
            }
            callback();
        }
    });

    await pipeline(
        process.stdin,
        transform,
        process.stdout
    );
};

lineNumberer();
