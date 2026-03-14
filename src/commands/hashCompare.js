import fs from 'fs';
import { createHash } from 'crypto';
import path from 'path';

export const hashCompare = async (currentDir, argsList, args) => {
  if (!args.input || !args.hash) {
    throw new Error('Invalid input');
  }

  const inputPath = path.resolve(currentDir, args.input);
  const hashPath = path.resolve(currentDir, args.hash);
  const algorithm = args.algorithm || 'sha256';

  if (!['sha256', 'md5', 'sha512'].includes(algorithm)) {
    throw new Error('Operation failed');
  }

  try {
    await fs.promises.access(inputPath);
    await fs.promises.access(hashPath);
  } catch {
    throw new Error('Operation failed');
  }

  const expectedHash = (await fs.promises.readFile(hashPath, 'utf8')).trim().toLowerCase();
  
  const hash = createHash(algorithm);
  const readStream = fs.createReadStream(inputPath);

  await new Promise((resolve, reject) => {
    readStream.pipe(hash).on('finish', () => {
        const calculatedHash = hash.digest('hex').toLowerCase();
        if (calculatedHash === expectedHash) {
            console.log('OK');
        } else {
            console.log('MISMATCH');
        }
        resolve();
    }).on('error', reject);
  });
};
