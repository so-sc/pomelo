// ponytail: in-process Map, per-instance only — if this ever runs multi-instance, swap for Redis.
const store = new Map();
const TTL_MS = 30_000;

const getOrSet = async (key, fn, ttl = TTL_MS) => {
    const hit = store.get(key);
    if (hit && hit.exp > Date.now()) return hit.val;
    const val = await fn();
    // A miss keeps the short ttl: a long one would pin a 404 for a doc that is
    // about to exist, and nothing invalidates a key that was never found.
    store.set(key, { val, exp: Date.now() + (val == null ? Math.min(ttl, TTL_MS) : ttl) });
    return val;
};

const invalidate = (key) => store.delete(key);

module.exports = { getOrSet, invalidate };
