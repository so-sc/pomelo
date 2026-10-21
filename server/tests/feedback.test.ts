import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const Submission = require('../models/Submissions');
const Contest = require('../models/Contest');
const { getFeedback, submitFeedback } = require('../controllers/contestCon');
const { getAdminContestFeedback } = require('../controllers/adminCon');

const contestId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const valid = { difficulty: 3, experience: 5, comment: '  Clear questions  ' };
const request = (body: unknown = valid) => ({
    params: { id: contestId }, user: { id: userId }, contest: { title: 'Assessment' }, body, query: {},
});
const response = () => ({
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
});
const next = (error: unknown) => { throw error; };
const query = (value: unknown) => ({ select: () => ({ lean: async () => value }) });

afterEach(() => mock.restoreAll());

test('feedback is optional on existing attempts and validates rating bounds', () => {
    const attempt = new Submission({ contest: contestId, user: userId });
    assert.equal(attempt.feedback, undefined);
    assert.equal(attempt.validateSync(), undefined);
    attempt.feedback = { difficulty: 1.5, experience: 6 };
    assert.ok(attempt.validateSync()?.errors['feedback.difficulty']);
    assert.ok(attempt.validateSync()?.errors['feedback.experience']);
});

test('feedback rejects missing, fractional, coerced and out-of-range ratings and oversized comments', async () => {
    const write = mock.method(Submission, 'findOneAndUpdate', () => { throw new Error('Must not write'); });
    for (const body of [undefined, {}, { ...valid, difficulty: 0 }, { ...valid, experience: 6 },
        { ...valid, difficulty: 2.5 }, { ...valid, experience: '5' }, { ...valid, comment: 'x'.repeat(2001) },
        { ...valid, user: userId }, { ...valid, comment: { $gt: '' } }]) {
        const res = response();
        const req = request(body);
        req.body = body;
        await submitFeedback(req, res, next);
        assert.equal(res.statusCode, 400);
    }
    assert.equal(write.mock.callCount(), 0);
});

test('feedback uses authenticated ownership and a one-time completed-attempt update', async () => {
    const write = mock.method(Submission, 'findOneAndUpdate', (filter: any, update: any, options: any) => {
        assert.deepEqual(filter, { contest: contestId, user: userId, status: 'Completed', feedback: { $exists: false } });
        assert.equal(update.$set.feedback.comment, 'Clear questions');
        assert.ok(update.$set.feedback.submittedAt instanceof Date);
        assert.equal(options.runValidators, true);
        return { select: async () => ({ feedback: update.$set.feedback }) };
    });
    const res = response();
    await submitFeedback(request(), res, next);
    assert.equal(res.statusCode, 201);
    assert.equal(write.mock.callCount(), 1);
});

test('ratings can be submitted without a comment', async () => {
    mock.method(Submission, 'findOneAndUpdate', (_filter: unknown, update: any) => {
        assert.equal(update.$set.feedback.comment, '');
        return { select: async () => ({ feedback: update.$set.feedback }) };
    });
    const res = response();
    await submitFeedback(request({ difficulty: 1, experience: 5 }), res, next);
    assert.equal(res.statusCode, 201);
});

test('missing, ongoing and already-reviewed attempts cannot receive feedback', async () => {
    mock.method(Submission, 'findOneAndUpdate', () => ({ select: async () => null }));
    for (const [attempt, status] of [[null, 404], [{ status: 'Ongoing' }, 403], [{ status: 'Completed' }, 409]] as const) {
        const find = mock.method(Submission, 'findOne', () => query(attempt));
        const res = response();
        await submitFeedback(request(), res, next);
        assert.equal(res.statusCode, status);
        assert.deepEqual(find.mock.calls[0].arguments[0], { contest: contestId, user: userId });
        find.mock.restore();
    }
});

test('feedback screen is available only for the caller’s completed attempt', async () => {
    for (const [attempt, status] of [[null, 404], [{ status: 'Ongoing' }, 403], [{ status: 'Completed' }, 200]] as const) {
        const find = mock.method(Submission, 'findOne', () => query(attempt));
        const res = response();
        await getFeedback(request(), res, next);
        assert.equal(res.statusCode, status);
        if (status === 200) assert.equal(res.body.feedback, null);
        assert.deepEqual(find.mock.calls[0].arguments[0], { contest: contestId, user: userId });
        find.mock.restore();
    }
});

test('existing feedback is returned when revisiting the screen', async () => {
    mock.method(Submission, 'findOne', () => query({ status: 'Completed', feedback: valid }));
    const res = response();
    await getFeedback(request(), res, next);
    assert.deepEqual(res.body.feedback, valid);
});

test('admin feedback returns whole-test averages and independently paginated reviews', async () => {
    mock.method(Contest, 'findById', () => query({ _id: contestId }));
    const aggregate = mock.method(Submission, 'aggregate', async () => [{
        stats: [{ count: 12, difficulty: 3.5, experience: 4 }], reviews: [], filteredCount: [{ total: 11 }],
    }]);
    const req = { ...request(), query: { page: '2', limit: '10' } };
    const res = response();
    await getAdminContestFeedback(req, res, next);
    assert.equal(res.body.count, 12);
    assert.equal(res.body.averageDifficulty, 3.5);
    assert.equal(res.body.totalReviews, 11);
    const pipeline = aggregate.mock.calls[0].arguments[0] as any;
    assert.deepEqual(pipeline[0].$match, { contest: contestId, status: 'Completed', feedback: { $exists: true } });
    assert.equal(pipeline[1].$facet.reviews[2].$skip, 10);
    assert.deepEqual(pipeline[1].$facet.reviews.at(-1), { $project: { feedback: 1 } });
});

test('admin feedback has an explicit empty state and bounds page sizes', async () => {
    mock.method(Contest, 'findById', () => query({ _id: contestId }));
    mock.method(Submission, 'aggregate', async () => []);
    const res = response();
    await getAdminContestFeedback({ ...request(), query: { page: '-2', limit: '500' } }, res, next);
    assert.equal(res.body.count, 0);
    assert.equal(res.body.averageDifficulty, null);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 100);
});

test('database errors reach the error handler', async () => {
    const error = new Error('Database unavailable');
    mock.method(Submission, 'findOneAndUpdate', () => { throw error; });
    let caught: unknown;
    await submitFeedback(request(), response(), (value: unknown) => { caught = value; });
    assert.equal(caught, error);
});

test('feedback query rejects invalid rating filters and sort keys before querying the database', async () => {
    const read = mock.method(Contest, 'findById', () => { throw new Error('Must not query'); });
    for (const query of [{ difficulty: '0' }, { experience: '6' }, { difficulty: ['1', '2'] },
        { experience: { $gt: 0 } }, { sort: 'constructor' }, { sort: ['oldest', 'newest'] }]) {
        const res = response();
        await getAdminContestFeedback({ ...request(), query }, res, next);
        assert.equal(res.statusCode, 400);
    }
    assert.equal(read.mock.callCount(), 0);
});

test('distribution responses always include all five ratings, including zero counts', async () => {
    mock.method(Contest, 'findById', () => query({ _id: contestId }));
    mock.method(Submission, 'aggregate', async () => [{
        stats: [{ count: 2, difficulty: 4, experience: 2 }],
        difficultyDistribution: [{ _id: 4, count: 2 }], experienceDistribution: [{ _id: 2, count: 2 }],
    }]);
    const res = response();
    await getAdminContestFeedback(request(), res, next);
    assert.deepEqual(res.body.difficultyDistribution.map((row: any) => row.count), [0, 0, 0, 2, 0]);
    assert.deepEqual(res.body.experienceDistribution.map((row: any) => row.rating), [1, 2, 3, 4, 5]);
});
