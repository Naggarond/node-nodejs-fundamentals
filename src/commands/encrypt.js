import fs from 'fs';
import { createCipheriv, scrypt, randomBytes } from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';

const pipelineAsync = promisify(pipeline);
const scryptAsync = promisify(scrypt);

export const encrypt = async (currentDir, argsList, args) => {
  console.log('encrypt args', args);
  if (!args.input || !args.output || !args.password) {
    throw new Error('Invalid input');
  }

  const inputPath = path.resolve(currentDir, args.input);
  const outputPath = path.resolve(currentDir, args.output);

  try {
    await fs.promises.access(inputPath);
  } catch {
    throw new Error('Operation failed');
  }

  const salt = randomBytes(16);
  const iv = randomBytes(12);
  
  const key = await scryptAsync(args.password, salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(outputPath);

  // Write salt and iv first
  writeStream.write(salt);
  writeStream.write(iv);

  await new Promise((resolve, reject) => {
    readStream.pipe(cipher).pipe(writeStream, { end: false });
    
    cipher.on('end', () => {
        const authTag = cipher.getAuthTag();
        writeStream.write(authTag);
        writeStream.end();
        resolve();
    });
    
    cipher.on('error', reject);
    readStream.on('error', reject);
    writeStream.on('error', reject);
  });
};
