const test = require('node:test');
const assert = require('node:assert');

const { scoreMcq } = require('../controllers/submitCon');

const single = { questionType: 'Single Correct', options: ['A', 'B', 'C', 'D'], correctAnswer: '1', marks: 4 };
const multiple = { questionType: 'Multiple Correct', options: ['A', 'B', 'C', 'D'], correctAnswer: '0,2', marks: 4 };

test('scoreMcq awards marks only for the exact answer', () => {
    assert.strictEqual(scoreMcq(single, ['B']), 4);
    assert.strictEqual(scoreMcq(single, ['A']), 0);
    assert.strictEqual(scoreMcq(multiple, ['C', 'A']), 4);
    assert.strictEqual(scoreMcq(multiple, ['A']), 0);
});

test('scoreMcq rejects selecting every option', () => {
    assert.strictEqual(scoreMcq(single, ['A', 'B', 'C', 'D']), 0);
    assert.strictEqual(scoreMcq(multiple, ['A', 'B', 'C', 'D']), 0);
});

test('scoreMcq rejects duplicated answers padding the count', () => {
    assert.strictEqual(scoreMcq(multiple, ['A', 'A']), 0);
});

test('scoreMcq gives nothing for questions without an answer key', () => {
    const coding = { questionType: 'Coding', marks: 10 };
    assert.strictEqual(scoreMcq(coding, []), 0);
    assert.strictEqual(scoreMcq(coding, [undefined]), 0);
    assert.strictEqual(scoreMcq({ ...single, correctAnswer: undefined }, [undefined]), 0);
});
