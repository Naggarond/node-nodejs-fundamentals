import path from 'path';

export const resolvePath = (currentDir, targetPath) => {
  if (!targetPath) return currentDir;
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(currentDir, targetPath);
};
