import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const linesIndex = args.indexOf('--lines');

if (outputIndex === -1 || linesIndex === -1) {
    console.error('Usage: node scripts/generate-logs.js --output <file> --lines <number>');
    process.exit(1);
}

const outputFile = args[outputIndex + 1];
const lineCount = parseInt(args[linesIndex + 1], 10);

if (isNaN(lineCount)) {
    console.error('Lines must be a number');
    process.exit(1);
}

const levels = ['INFO', 'WARN', 'ERROR'];
const services = ['user-service', 'auth-service', 'payment-service', 'order-service'];
const methods = ['GET', 'POST', 'PUT', 'DELETE'];
const paths = ['/api/users', '/api/auth/login', '/api/orders', '/api/payments', '/api/products'];
const statuses = {
    'GET': [200, 200, 200, 404, 500],
    'POST': [201, 400, 400, 500],
    'PUT': [200, 404, 400],
    'DELETE': [204, 404, 403]
};

const stream = fs.createWriteStream(path.resolve(process.cwd(), outputFile));

for (let i = 0; i < lineCount; i++) {
    const timestamp = new Date().toISOString();
    const level = levels[Math.floor(Math.random() * levels.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const pathUrl = paths[Math.floor(Math.random() * paths.length)];
    const statusList = statuses[method];
    const status = statusList[Math.floor(Math.random() * statusList.length)];
    const responseTime = Math.floor(Math.random() * 500) + 10;
    
    stream.write(`${timestamp} ${level} ${service} ${status} ${responseTime} ${method} ${pathUrl}\n`);
}

stream.end();
console.log(`Generated ${lineCount} logs in ${outputFile}`);
