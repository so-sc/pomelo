const os = require('os');
const { Worker } = require('worker_threads');

// bcrypt is CPU-bound, and bcryptjs runs it on the event loop: 100 logins at once kept
// every other request waiting ~6s. A few worker threads take that work off the loop and
// run it in parallel. Capped low because Citron and Mongo share the host's CPUs.
const POOL_SIZE = Math.max(1, Math.min(4, os.availableParallelism() - 1));

// Beyond this many queued jobs a flood would only delay real logins; fail fast instead
// (the client shows "server busy").
const MAX_QUEUED = 500;

const pending = new Map(); // id -> { resolve, reject, slot }
const workers = [];
let nextId = 0;
let turn = 0;

const spawn = (slot) => {
    const worker = new Worker(require.main.filename, { workerData: { role: 'password' } });
    worker.on('message', ({ id, result, error }) => {
        const job = pending.get(id);
        if (!job) return;
        pending.delete(id);
        if (error) job.reject(new Error(error));
        else job.resolve(result);
    });
    // A dead worker fails its in-flight jobs and is replaced, so one crash can't wedge logins.
    worker.on('exit', () => {
        for (const [id, job] of pending) {
            if (job.slot !== slot) continue;
            pending.delete(id);
            job.reject(new Error('Password worker exited'));
        }
        workers[slot] = null;
    });
    worker.unref();
    workers[slot] = worker;
    return worker;
};

const run = (op, args) => new Promise((resolve, reject) => {
    if (pending.size >= MAX_QUEUED) {
        reject(Object.assign(new Error('Password service is busy'), { statusCode: 503 }));
        return;
    }
    const slot = turn++ % POOL_SIZE;
    const worker = workers[slot] || spawn(slot);
    const id = nextId++;
    pending.set(id, { resolve, reject, slot });
    worker.postMessage({ id, op, args });
});

module.exports = {
    hashPassword: (password, rounds = 10) => run('hash', [password, rounds]),
    verifyPassword: (password, hash) => run('compare', [password, hash]),
};
