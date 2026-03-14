import fs from 'fs';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';

const pipelineAsync = promisify(pipeline);

export const count = async (currentDir, argsList,  args) => {
    if (!args.input) {
        throw new Error('Invalid input');
    }

    const inputPath = path.resolve(currentDir, args.input);

     try {
        await fs.promises.access(inputPath);
    } catch {
        throw new Error('Operation failed');
    }


    let lines = 0;
    let words = 0;
    let chars = 0;

    const countStream = new Transform({
        transform(chunk, encoding, callback) {
            const str = chunk.toString();
            chars += str.length;
            
            // Count lines
            // Don't just split by \n because chunk might end in middle of line
            // but for counting lines, simple split - 1 is enough if last char is \n, or specific logic
            // Re-implementing 'wc -l' logic: count newline characters
            for (let i = 0; i < str.length; i++) {
                if (str[i] === '\n') lines++;
            }
            
            // Count words (sequence of non-whitespace)
            // This is tricky across chunks. "word" could be split.
            // Simplified approach: split by all whitespace
            // Better approach: maintain state 'inWord'
            let inWord = this.inWord || false;
            for (let i = 0; i < str.length; i++) {
                 const isSpace = /\s/.test(str[i]);
                 if (!isSpace && !inWord) {
                     words++;
                     inWord = true;
                 } else if (isSpace) {
                     inWord = false;
                 }
            }
            this.inWord = inWord;

            callback();
        },
        flush(callback) {
             // If file doesn't end with newline, we might count lines correctly based on \n count, 
             // but wc -l counts newlines. If text is "a", wc -l gives 0? No, usually 1 if no newline at end? 
             // Actually `wc -l` counts newline characters.
             // But prompt says "Count lines... similar to wc".
             // Let's stick to newline count.
             callback();
        }
    });

    const readStream = fs.createReadStream(inputPath);
    
    await new Promise((resolve, reject) => {
        readStream.pipe(countStream)
            .on('finish', resolve)
            .on('error', reject);
    });

    // Check if empty file or adjust logic
    // If file has content but no newline at end, wc -l says lines=0 (or 1 depending on impl).
    // Let's assume standard definitions.
    
    console.log(`Lines: ${lines}`);
    console.log(`Words: ${words}`);
    console.log(`Characters: ${chars}`);
};
