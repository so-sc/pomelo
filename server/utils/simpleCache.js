// ponytail: in-process Map, per-instance only — if this ever runs multi-instance, swap for Redis.
const store = new Map();
const TTL_MS = 30_000;

const getOrSet = async (key, fn) => {
    const hit = store.get(key);
    if (hit && hit.exp > Date.now()) return hit.val;
    const val = await fn();
    store.set(key, { val, exp: Date.now() + TTL_MS });
    return val;
};

const invalidate = (key) => store.delete(key);

module.exports = { getOrSet, invalidate };
