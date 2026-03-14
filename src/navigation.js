import fs from 'fs/promises';
import path from 'path';

export const up = async (currentDir) => {
  console.log('up', currentDir);
  const parent = path.dirname(currentDir);
  return parent !== currentDir ? parent : currentDir;
};

export const cd = async (currentDir, targetPath) => {
  if (!targetPath) {
    return currentDir;
  }
  
  const newPath = path.isAbsolute(targetPath) 
    ? targetPath 
    : path.resolve(currentDir, targetPath);

  try {
    const stats = await fs.stat(newPath);
    if (!stats.isDirectory()) {
      throw new Error('Not a directory');
    }
    return newPath;
  } catch (error) {
    throw new Error('Operation failed');
  }
};

export const ls = async (currentDir) => {
  try {
    const files = await fs.readdir(currentDir);
    const entries = await Promise.all(
        files.map(async (file) => {
            try {
                const stats = await fs.stat(path.join(currentDir, file));
                return {
                    name: file,
                    type: stats.isDirectory() ? 'directory' : 'file'
                };
            } catch {
                return null;
            }
        })
    );

    const validEntries = entries.filter(e => e !== null);

    const sorted = validEntries.sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      // Then alphabetical
      return a.name.localeCompare(b.name);
    });

    sorted.forEach(entry => {
        const typeStr = entry.type === 'directory' ? `\x1b[38;2;255;255;0m[folder]\x1b[0m` : `\x1b[38;2;60;60;600m[file]\x1b[0m`;
        console.log(`${entry.name.padEnd(25)} ${typeStr}`);
    });
  } catch (error) {
    throw new Error('Operation failed');
  }
};
