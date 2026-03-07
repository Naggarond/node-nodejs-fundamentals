import { setTimeout } from 'timers/promises';

const progress = async () => {
    const args = process.argv.slice(2);
    const getArg = (name, def) => {
        const idx = args.indexOf(name);
        if (idx !== -1 && args[idx + 1]) {
            const val = parseInt(args[idx + 1]);
            return isNaN(val) ? def : val;
        }
        return def;
    };
    const getArgStr = (name, def) => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
    }

    const duration = getArg('--duration', 5000);
    const interval = getArg('--interval', 100);
    const length = getArg('--length', 30);
    const color = getArgStr('--color', '');

    const totalSteps = Math.ceil(duration / interval);
    let currentStep = 0;

    const render = (percent) => {
        const filledLength = Math.round(length * percent / 100);
        const emptyLength = length - filledLength;
        const filled = '█'.repeat(filledLength);
        const empty = ' '.repeat(emptyLength);
        
        let bar = filled + empty;
        if (color) {
            if (/^#[0-9a-fA-F]{6}$/.test(color)) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                const coloredFilled = `\x1b[38;2;${r};${g};${b}m${filled}\x1b[0m`;
                bar = coloredFilled + empty;
            }
        }
        
        process.stdout.write(`\r[${bar}] ${percent}%`);
    };

    while (currentStep <= totalSteps) {
        const percent = Math.min(100, Math.floor((currentStep / totalSteps) * 100));
        render(percent);
        if (currentStep >= totalSteps) break;
        await setTimeout(interval);
        currentStep++;
    }
    
    process.stdout.write('\nDone!\n');
};

progress();
