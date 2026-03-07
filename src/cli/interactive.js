import readline from 'readline';

const interactive = () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '> '
    });

    rl.prompt();

    rl.on('line', (line) => {
        const cmd = line.trim();
        switch (cmd) {
            case 'uptime':
                console.log(`Uptime: ${process.uptime().toFixed(2)}s`);
                break;
            case 'cwd':
                console.log(process.cwd());
                break;
            case 'date':
                console.log(new Date().toISOString());
                break;
            case 'exit':
                rl.close();
                return; // Prevent prompt
            default:
                console.log('Unknown command');
                break;
        }
        rl.prompt();
    }).on('close', () => {
        console.log('Goodbye!');
        process.exit(0);
    });
};

interactive();
