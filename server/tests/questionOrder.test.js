const test = require('node:test');
const assert = require('node:assert');

const { orderQuestionsFor } = require('../utils/questionOrder');

const questions = Array.from({ length: 8 }, (_, i) => ({ _id: `q${i}` }));
const ids = (list) => list.map((q) => q._id);

test('orderQuestionsFor keeps the authored order when shuffling is off', () => {
    assert.deepStrictEqual(ids(orderQuestionsFor({ _id: 'c1', questions }, 'u1')), ids(questions));
});

test('orderQuestionsFor gives one candidate the same order every time', () => {
    const contest = { _id: 'c1', questions, shuffleQuestions: true };
    assert.deepStrictEqual(ids(orderQuestionsFor(contest, 'u1')), ids(orderQuestionsFor(contest, 'u1')));
});

test('orderQuestionsFor gives different candidates different orders of the same questions', () => {
    const contest = { _id: 'c1', questions, shuffleQuestions: true };
    const orders = ['u1', 'u2', 'u3', 'u4'].map((u) => ids(orderQuestionsFor(contest, u)).join());
    assert.ok(new Set(orders).size > 1);
    orders.forEach((o) => assert.deepStrictEqual(o.split(',').sort(), ids(questions).sort()));
});
