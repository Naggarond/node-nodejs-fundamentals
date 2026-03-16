export const parseArgs = (args) => {
  const parsed = {};
  const positional = [];
  
  for (let i = 0; i < args.length; i++) {
   const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      // If next arg exists and is not a flag, consume it as value
      if (nextArg && !nextArg.startsWith('--')) {
        parsed[key] = nextArg;
        i++;
      } else {
        // Otherwise treat as boolean flag
        parsed[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  
  return { ...parsed, _: positional };
};
