const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');

// Stub the model: this is about ordering logic, not Mongo. The stub returns
// documents in a deliberately different order from the requested ids, which is
// exactly what Mongo does for $in.
const docs = [
    { _id: 'c1', type: 'coding', title: 'Coding 1' },
    { _id: 'c2', type: 'coding', title: 'Coding 2' },
    { _id: 'm1', type: 'mcq', title: 'MCQ 1' },
    { _id: 'm2', type: 'mcq', title: 'MCQ 2' },
];

const makeQuery = (ids) => {
    const matched = docs.filter((d) => ids.some((id) => String(id) === d._id));
    const query = Promise.resolve(matched);
    query.lean = () => Promise.resolve(matched);
    return query;
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === '../models/Question') {
        return { find: ({ _id: { $in: ids } }) => makeQuery(ids) };
    }
    return originalLoad(request, parent, isMain);
};
const { findQuestionsInOrder } = require('../utils/findQuestionsInOrder');
Module._load = originalLoad;

test('returns questions in the order the contest lists them, not storage order', async () => {
    // Admin arranged MCQs first; storage order has coding first.
    const ordered = await findQuestionsInOrder(['m1', 'm2', 'c1', 'c2'], { lean: true });

    assert.deepStrictEqual(ordered.map((q) => q._id), ['m1', 'm2', 'c1', 'c2']);
    assert.strictEqual(ordered[0].type, 'mcq', 'an attempt must start on the first listed question');
});

test('drops ids with no surviving question instead of leaving holes', async () => {
    // Question deletion has no cascade, so a contest can reference a missing id.
    const ordered = await findQuestionsInOrder(['m1', 'deleted', 'c1']);

    assert.deepStrictEqual(ordered.map((q) => q._id), ['m1', 'c1']);
    assert.ok(ordered.every(Boolean), 'no undefined entries');
});

test('handles empty and omitted id lists', async () => {
    assert.deepStrictEqual(await findQuestionsInOrder([]), []);
    assert.deepStrictEqual(await findQuestionsInOrder(), []);
});
