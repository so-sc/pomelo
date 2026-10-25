const test = require('node:test');
const assert = require('node:assert');

const { getContestLanding } = require('../controllers/contestCon');

const landing = async (contest) => {
    let body;
    await getContestLanding({ contest }, { json: (b) => { body = b; } }, (err) => { throw err; });
    return body.data;
};

const hour = 3600000;

test('getContestLanding lets candidates start an open contest', async () => {
    const data = await landing({ title: 'T', questions: [], startTime: new Date(Date.now() - hour), endTime: new Date(Date.now() + hour), durationMinutes: 30 });
    assert.strictEqual(data.isEnded, false);
    assert.strictEqual(data.canStart, true);
});

test('getContestLanding reports ended contests, by time or manual end', async () => {
    const past = await landing({ title: 'T', questions: [], startTime: new Date(Date.now() - 2 * hour), endTime: new Date(Date.now() - hour), durationMinutes: 30 });
    assert.strictEqual(past.isEnded, true);
    const manual = await landing({ title: 'T', questions: [], status: 'completed', startTime: new Date(Date.now() - hour), endTime: new Date(Date.now() + hour), durationMinutes: 30 });
    assert.strictEqual(manual.isEnded, true);
    assert.strictEqual(manual.canStart, false);
});
