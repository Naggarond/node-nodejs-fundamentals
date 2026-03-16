import fs from 'fs';
import { createDecipheriv, scrypt } from 'crypto';
import { Transform } from 'stream';
import { promisify } from 'util';
import path from 'path';

const scryptAsync = promisify(scrypt);

export const decrypt = async (currentDir, argsList, args) => {
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

  const readStream = fs.createReadStream(inputPath);
  
  // Need to read first 28 bytes for salt and iv
  // We can use 'readable' event or a transform stream that handles the header vs body.
  
  let salt;
  let iv;
  let key;
  let decipher;
  let isHeaderRead = false;
  let headerBuffer = Buffer.alloc(0);
  
  const writeStream = fs.createWriteStream(outputPath);

  // A Transform stream that:
  // 1. Buffers first 28 bytes (salt+iv)
  // 2. Initializes decipher
  // 3. Buffers everything else maintaining a 16-byte window for authTag at the end
  // 4. On flush, sets authTag and pushes remaining data (which is effectively empty as last 16 bytes are tag)
  
  const decryptStream = new Transform({
    transform(chunk, encoding, callback) {
        let currentChunk = chunk;
        
        if (!isHeaderRead) {
            headerBuffer = Buffer.concat([headerBuffer, currentChunk]);
            if (headerBuffer.length >= 28) {
                salt = headerBuffer.subarray(0, 16);
                iv = headerBuffer.subarray(16, 28);
                const remaining = headerBuffer.subarray(28);
                
                isHeaderRead = true;
                
                // Initialize decipher
                scryptAsync(args.password, salt, 32).then(derivedKey => {
                    key = derivedKey;
                    decipher = createDecipheriv('aes-256-gcm', key, iv);
                    
                    // Pipe decipher output to writeStream - handle distinct pipe logic?
                    // Better: Push to decipher, let decipher push to us? 
                    // No, simpler: We pipe checks -> decipher -> writeStream.
                    // But we need to handle authTag.
                    
                    // Let's manually manage decipher writing
                    decipher.on('data', (data) => this.push(data));
                    decipher.on('error', (err) => this.emit('error', err)); // Or handle auth fail
                    
                    if (remaining.length > 0) {
                        this._processBody(remaining);
                    }
                    callback();
                }).catch(err => callback(err));
                return; // Wait for async scrypt
            } else {
                callback();
                return;
            }
        } else {
             this._processBody(currentChunk);
             callback();
        }
    },
    
    flush(callback) {
        if (!isHeaderRead) {
            callback(new Error('File too short'));
            return;
        }
        
        // Finalize
        if (this.authTagBuffer && this.authTagBuffer.length === 16) {
             decipher.setAuthTag(this.authTagBuffer);
             decipher.final(); // This might emit data? 
             // Usually final() for GCM doesn't emit data but verifies tag. 
             // If validation fails, it throws.
             // We need to catch that throw.
             try {
                 // decipher.final() returns nothing for GCM usually, or empty buffer?
                 // But validation happens here.
                 // Actually decipher.final() logic:
                 // "Once the setAuthTag() method has been called... final() will verify..."
                 // decipher is a stream. calling final() is for Cipher object.
                 // For Decipher stream, we should end it?
                 decipher.end(); 
                 // But we haven't piped anything into decipher really. We are writing to it.
             } catch (err) {
                 callback(err);
                 return;
             }
        } else {
             callback(new Error('File too short for auth tag'));
             return;
        }
        callback();
    }
  });
  
  // Attach helper method to instance
  decryptStream.authTagBuffer = Buffer.alloc(0);
  decryptStream._processBody = function(chunk) {
      if (this.authTagBuffer.length === 0) {
          if (chunk.length > 16) {
               const data = chunk.subarray(0, chunk.length - 16);
               this.authTagBuffer = chunk.subarray(chunk.length - 16);
               decipher.write(data);
          } else {
               this.authTagBuffer = chunk;
          }
      } else {
          // We have some buffer. New chunk comes.
          // Combine.
          const total = Buffer.concat([this.authTagBuffer, chunk]);
          if (total.length > 16) {
               const data = total.subarray(0, total.length - 16);
               this.authTagBuffer = total.subarray(total.length - 16);
               decipher.write(data);
          } else {
               this.authTagBuffer = total;
          }
      }
  };

  await new Promise((resolve, reject) => {
      readStream.pipe(decryptStream).pipe(writeStream)
          .on('finish', resolve)
          .on('error', () => {
              console.log('Operation failed'); // Print directly or let caller handle? Caller handles.
              reject(new Error('Operation failed'));
          });
      
      decryptStream.on('error', (err) => {
          // Auth tag mismatch throws here usually
           reject(new Error('Operation failed'));
      });
  });
};
