const test = require('node:test');
const assert = require('node:assert');

const { escapeRegex } = require('../utils/escapeRegex');
const { _hasUnsafeKeys: hasUnsafeKeys } = require('../controllers/dataCon');

test('escapeRegex makes a search term match literally, not as a pattern', () => {
    const rx = new RegExp(escapeRegex('a.*b'), 'i');

    assert.ok(rx.test('xxa.*byy'), 'should match the literal text');
    assert.ok(!rx.test('acccb'), 'must not behave as a wildcard');
});

test('escapeRegex neutralises a catastrophically backtracking pattern', () => {
    // Unescaped, /(a+)+$/ against a long non-matching string hangs.
    const rx = new RegExp(escapeRegex('(a+)+$'));

    assert.ok(rx.test('literal (a+)+$ here'));
    assert.ok(!rx.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!'));
});

test('hasUnsafeKeys still rejects a client-supplied $regex filter', () => {
    // This is why search is a plain string translated server-side.
    assert.strictEqual(hasUnsafeKeys({ title: { $regex: 'x' } }), true);
    assert.strictEqual(hasUnsafeKeys({ $or: [{ title: 'a' }] }), true);
    assert.strictEqual(hasUnsafeKeys({ 'user.name': 'a' }), true);
    assert.strictEqual(hasUnsafeKeys([{ nested: { $ne: 1 } }]), true);
});

test('hasUnsafeKeys allows the plain equality filters the admin pages send', () => {
    assert.strictEqual(hasUnsafeKeys({ type: 'coding', difficulty: 'Hard' }), false);
    assert.strictEqual(hasUnsafeKeys({ contest: 'abc', status: 'Completed' }), false);
});
