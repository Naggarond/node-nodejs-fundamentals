import path from 'path';
import { fileURLToPath } from 'url';

const dynamic = async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('Plugin name required');
        process.exit(1);
    }
    const pluginName = args[0];
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pluginPath = path.join(__dirname, 'plugins', `${pluginName}.js`);

    try {
        const module = await import(pluginPath);
        console.log(module.run());
    } catch (err) {
        console.error('Plugin not found');
        process.exit(1);
    }
};

await dynamic();
