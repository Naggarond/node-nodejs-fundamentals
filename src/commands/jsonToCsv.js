import fs from 'fs';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';

const pipelineAsync = promisify(pipeline);

export const jsonToCsv = async (currentDir, argsList, args) => {
  if (!args.input || !args.output) {
    throw new Error('Invalid input');
  }

  const inputPath = path.resolve(currentDir, args.input);
  const outputPath = path.resolve(currentDir, args.output);

  let jsonData;
  try {
    const fileContent = await fs.promises.readFile(inputPath, 'utf8');
    jsonData = JSON.parse(fileContent);
    if (!Array.isArray(jsonData)) {
        throw new Error('Operation failed');
    }
  } catch {
    throw new Error('Operation failed');
  }

  const writeStream = fs.createWriteStream(outputPath);

  if (jsonData.length === 0) {
      writeStream.end();
      return;
  }

  const headers = Object.keys(jsonData[0]);
  
  const transformStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      const values = headers.map(header => chunk[header] || ''); // Handle missing keys
      this.push(values.join(',') + '\n');
      callback();
    }
  });

  // Write headers first
  writeStream.write(headers.join(',') + '\n');

  // Create readable stream from array
  const readableStream = new Transform({ objectMode: true });
  jsonData.forEach(item => readableStream.push(item));
  readableStream.push(null); // End stream

  await pipelineAsync(readableStream, transformStream, writeStream);
  console.log(`File converted: ${outputPath}`);
};
