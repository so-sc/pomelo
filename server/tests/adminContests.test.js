const test = require('node:test');
const assert = require('node:assert');

const { _statusQuery: statusQuery } = require('../controllers/adminCon');

const NOW = new Date('2026-06-15T12:00:00.000Z');

// Mirrors the summary mapping in getAdminContests: manual end wins, otherwise
// the time window decides.
const computeStatus = (contest, now) => {
    const stored = (contest.status || '').toLowerCase();
    if (stored === 'completed' || stored === 'ended') return 'completed';
    if (now > contest.endTime) return 'completed';
    if (now >= contest.startTime && now <= contest.endTime) return 'ongoing';
    return 'waiting';
};

// Minimal evaluator for the subset of Mongo operators the predicates use.
const matches = (query, doc) =>
    Object.entries(query).every(([key, cond]) => {
        if (key === '$or') return cond.some((sub) => matches(sub, doc));
        if (key === '$and') return cond.every((sub) => matches(sub, doc));

        const value = doc[key];
        if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
            return Object.entries(cond).every(([op, operand]) => {
                switch (op) {
                    case '$in': return operand.includes(value);
                    case '$nin': return !operand.includes(value);
                    case '$lt': return value < operand;
                    case '$lte': return value <= operand;
                    case '$gt': return value > operand;
                    case '$gte': return value >= operand;
                    default: throw new Error(`unhandled operator ${op}`);
                }
            });
        }
        return value === cond;
    });

const CONTESTS = [
    { name: 'not started', startTime: new Date('2026-07-01'), endTime: new Date('2026-07-02') },
    { name: 'in window', startTime: new Date('2026-06-01'), endTime: new Date('2026-07-01') },
    { name: 'window passed', startTime: new Date('2026-05-01'), endTime: new Date('2026-06-01') },
    { name: 'manually ended, window still open', status: 'ended', startTime: new Date('2026-06-01'), endTime: new Date('2026-07-01') },
    { name: 'manually completed, not started', status: 'completed', startTime: new Date('2026-07-01'), endTime: new Date('2026-07-02') },
    { name: 'stored ongoing but window passed', status: 'ongoing', startTime: new Date('2026-05-01'), endTime: new Date('2026-06-01') },
    { name: 'stored upcoming, in window', status: 'upcoming', startTime: new Date('2026-06-01'), endTime: new Date('2026-07-01') },
    { name: 'now exactly at endTime', startTime: new Date('2026-06-01'), endTime: NOW },
    { name: 'now exactly at startTime', startTime: NOW, endTime: new Date('2026-07-01') },
];

test('each status filter selects exactly the contests that render with that status', () => {
    for (const status of ['waiting', 'ongoing', 'completed']) {
        const selected = CONTESTS.filter((c) => matches(statusQuery(status, NOW), c)).map((c) => c.name);
        const expected = CONTESTS.filter((c) => computeStatus(c, NOW) === status).map((c) => c.name);

        assert.deepStrictEqual(selected.sort(), expected.sort(), `mismatch for status "${status}"`);
    }
});

test('the three filters partition the set — every contest matches exactly one', () => {
    for (const contest of CONTESTS) {
        const hits = ['waiting', 'ongoing', 'completed'].filter((s) => matches(statusQuery(s, NOW), contest));
        assert.deepStrictEqual(hits.length, 1, `${contest.name} matched ${hits.length} filters: ${hits}`);
    }
});

test('an unknown or absent status yields no filter', () => {
    assert.strictEqual(statusQuery(undefined, NOW), undefined);
    assert.strictEqual(statusQuery('bogus', NOW), undefined);
});
