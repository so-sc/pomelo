const test = require('node:test');
const assert = require('node:assert');

const { buildScoreCSV } = require('../utils/resultsIO/export');

test('buildScoreCSV keeps candidate names from running as spreadsheet formulas', () => {
    const contest = { questions: [{ _id: 'q1', title: 'Q1', marks: 5 }] };
    const csv = buildScoreCSV(contest, [
        { user: { name: '=HYPERLINK("http://evil")', email: 'a@x.io' }, totalScore: 5, submissions: [{ question: { _id: 'q1' }, score: 5 }] },
        { user: { name: '+cmd', email: 'b@x.io' }, totalScore: 0, submissions: [] },
    ]);
    const [, a, b] = csv.split('\n');
    assert.ok(a.startsWith(`"'=HYPERLINK(""http://evil"")"`), a);
    assert.ok(b.startsWith("'+cmd,"), b);
});
