import fs from 'fs';
import { createHash } from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';

const pipelineAsync = promisify(pipeline);

export const hashFunc = async (currentDir, argsList, args) => {
  if (!args.input) {
    throw new Error('Invalid input');
  }

  const inputPath = path.resolve(currentDir, args.input);
  const algorithm = args.algorithm || 'sha256';

  if (!['sha256', 'md5', 'sha512'].includes(algorithm)) {
    throw new Error('Operation failed');
  }

  try {
    await fs.promises.access(inputPath);
  } catch {
    throw new Error('Operation failed');
  }

  const hash = createHash(algorithm);
  const readStream = fs.createReadStream(inputPath);

  // We can't just pipe to stdout because we might need to save.
  // We need to capture the hash.
  
  await new Promise((resolve, reject) => {
    readStream.pipe(hash).on('finish', () => {
        const result = hash.digest('hex');
        console.log(`${algorithm}: ${result}`);

        if (args.save) {
            const savePath = `${inputPath}.${algorithm}`;
            fs.writeFile(savePath, result, (err) => {
                if (err) reject(new Error('Operation failed'));
                else resolve();
            });
        } else {
            resolve();
        }
    }).on('error', reject);
  });
};
