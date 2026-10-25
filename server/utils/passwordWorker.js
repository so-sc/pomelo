// Runs bcrypt off the main thread; see utils/passwords.js.
const { parentPort } = require('worker_threads');
const bcrypt = require('bcryptjs');

parentPort.on('message', ({ id, op, args }) => {
    try {
        const result = op === 'hash' ? bcrypt.hashSync(...args) : bcrypt.compareSync(...args);
        parentPort.postMessage({ id, result });
    } catch (err) {
        parentPort.postMessage({ id, error: err.message });
    }
});
