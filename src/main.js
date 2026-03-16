import readline from 'readline';
import { homedir } from 'os';
import * as navigation from './navigation.js';
import { parseArgs } from './utils/argParser.js';
import { csvToJson } from './commands/csvToJson.js';
import { jsonToCsv } from './commands/jsonToCsv.js';
import { count } from './commands/count.js';
import { hashFunc } from './commands/hash.js';
import { hashCompare } from './commands/hashCompare.js';
import { encrypt } from './commands/encrypt.js';
import { decrypt } from './commands/decrypt.js';
import { logStats } from './commands/logStats.js';

const context = {
  currentDir: homedir()
};


const Commands = {
  UP: 'up',
  CD: 'cd',
  LS: 'ls',
  COUNT: 'count',
  CVS2JSON: 'csv-to-json',
  JSON2CSV: 'json-to-csv',
  HASH: 'hash',
  HASH2COMPARE: 'hash-compare',
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt',
  LOGSTATS: 'log-stats'
}

const CommandsBody = {
  [Commands.UP]: async (dir) => {
    context.currentDir = await navigation.up(dir);
  },
  [Commands.CD]: async (dir, args) => {
    if (args.length === 0) {
      throw new Error('Invalid input');
    }
    context.currentDir  = await navigation.cd(dir, args[0]);
  },
  [Commands.LS]: navigation.ls,
  [Commands.CVS2JSON]: csvToJson,
  [Commands.JSON2CSV]:jsonToCsv,
  [Commands.COUNT]: count,
  [Commands.hashFunc]: hashFunc,
  [Commands.HASH2COMPARE]: hashCompare,
  [Commands.ENCRYPT]: encrypt,
  [Commands.DECRYPT]: decrypt,
  [Commands.LOGSTATS]: logStats
}

const startRepl = () => {
    console.log(`Welcome to Data Processing CLI!`);
    console.log(`You are currently in ${context.currentDir}`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });

    rl.prompt();

    rl.on('line', async (line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            rl.prompt();
            return;
        }

        if (trimmed === '.exit') {
            rl.close();
            return;
        }

        const argsRaw = extractArgs(trimmed);
        const command = argsRaw[0];
        const argsList = argsRaw.slice(1);
        const args = parseArgs(argsList);
        
        try {
          if (CommandsBody[command]) {
            await CommandsBody[command](context.currentDir, argsList, args);
          } else {
            console.log('Invalid input');
          }
          console.log(`You are currently in ${context.currentDir}`);
        } catch (err) {
          // console.log(err);
          if (err.message === 'Invalid input' || err.message === 'Operation failed') {
                console.log(err.message);
          } else {
                console.log('Operation failed');
          }
        }
        
        rl.prompt();
    });

    rl.on('close', () => {
        console.log(`Thank you for using Data Processing CLI!`);
        process.exit(0);
    });
};

const extractArgs = (input) => {
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const matches = [];
    let match;
    while ((match = regex.exec(input)) !== null) {
      if (match[1] !== undefined) {
        matches.push(match[1]);
      }
      else if (match[2] !== undefined) {
        matches.push(match[2]);
      }
      else {
        matches.push(match[0]);
      }
    }

    return matches;
};


startRepl();