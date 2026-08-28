const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const { findContestQuestion } = require('../controllers/submitCon');

// The snapshot lookup is the authorization check for run/submit/mcq: a question
// the test doesn't own must not resolve.
test('findContestQuestion resolves a question the contest owns', () => {
    const id = new mongoose.Types.ObjectId();
    const contest = { questions: [{ _id: id, title: 'Q1' }] };

    assert.strictEqual(findContestQuestion(contest, id).title, 'Q1');
    assert.strictEqual(findContestQuestion(contest, id.toString()).title, 'Q1');
});

test('findContestQuestion rejects a question outside the contest', () => {
    const contest = { questions: [{ _id: new mongoose.Types.ObjectId() }] };

    assert.strictEqual(findContestQuestion(contest, new mongoose.Types.ObjectId()), undefined);
    assert.strictEqual(findContestQuestion(contest, undefined), undefined);
    assert.strictEqual(findContestQuestion({}, new mongoose.Types.ObjectId()), undefined);
    assert.strictEqual(findContestQuestion(null, 'x'), undefined);
});
