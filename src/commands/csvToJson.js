import fs from 'fs';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';

const pipelineAsync = promisify(pipeline);

const parseCsvLine = (line) => {
  // Simple CSV parsing: split by comma, no quotes handling for now as per simple requirement
  return line.split(','); 
};

export const csvToJson = async (currentDir, argsList, args) => {
  if (!args.input || !args.output) {
    throw new Error('Invalid input');
  }

  const inputPath = path.resolve(currentDir, args.input);
  const outputPath = path.resolve(currentDir, args.output);

  try {
    await fs.promises.access(inputPath);
  } catch {
    throw new Error('Operation failed');
  }

  const readStream = fs.createReadStream(inputPath, { encoding: 'utf8' });
  const writeStream = fs.createWriteStream(outputPath);

  let isFirstLine = true;
  let headers = [];
  let isFirstObject = true;

  const transformStream = new Transform({
    writableObjectMode: true,
    readableObjectMode: false,
    transform(chunk, encoding, callback) {
      const data = chunk.toString();
      const lines = data.split(/\r?\n/);
      
      // Handle the last line potentially being incomplete - buffer it
      if (this.lastLineData) {
        lines[0] = this.lastLineData + lines[0];
        this.lastLineData = '';
      }
      
      const lastLine = lines.pop();
       if (lastLine !== '' && data.endsWith('\n')) {
          lines.push(lastLine);
      } else {
        this.lastLineData = lastLine;
      }

      for (const line of lines) {
        if (!line.trim()) continue;
        
        if (isFirstLine) {
          headers = parseCsvLine(line.trim());
          isFirstLine = false;
          this.push('['); // Start JSON array
        } else {
          const values = parseCsvLine(line.trim());
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index];
          });
          
          if (!isFirstObject) {
            this.push(',');
          }
          this.push(JSON.stringify(obj, null, 2));
          isFirstObject = false;
        }
      }
      callback();
    },
    flush(callback) {
        if (this.lastLineData) {
             const line = this.lastLineData;
             if (line.trim()) {
                 if (isFirstLine) { // Only one line in file?
                     // ... edge case
                 } else {
                    const values = parseCsvLine(line.trim());
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index];
                    });
                    if (!isFirstObject) {
                       this.push(',');
                    }
                    this.push(JSON.stringify(obj, null, 2));
                 }
             }
        }
       if (!isFirstLine) {
        this.push(']');
       } else {
           // Empty file or just headers
           this.push('[]');
       }
       callback();
    }
  });

  await pipelineAsync(readStream, transformStream, writeStream);
  console.log(`File converted: ${outputPath}`);
};
