import { spawn } from 'child_process';

const execCommand = async () => {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        process.exit(1);
    }

    const child = spawn(command, {
        shell: true,
        env: process.env
    });

    if (child.stdout) {
        child.stdout.pipe(process.stdout);
    }
    if (child.stderr) {
        child.stderr.pipe(process.stderr);
    }

    child.on('exit', (code) => {
        process.exit(code);
    });
};

execCommand();
