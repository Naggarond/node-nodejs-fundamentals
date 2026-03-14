import { parentPort } from 'worker_threads';

const sort = (data) => {
    if (!Array.isArray(data)) return [];
    data.sort((a, b) => a - b);
    return data;
};

parentPort.on('message', (data) => {
    const result = sort(data);
    parentPort.postMessage(result);
});
