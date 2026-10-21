import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';

const mongoose = require('mongoose');
const express = require('express');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const User = require('../models/User');

// Explicit opt-in; the suite creates and removes its own uniquely named database.
test('feedback HTTP authorization, persistence and aggregation', {
    skip: !process.env.FEEDBACK_TEST_MONGODB_URI,
}, async (t) => {
    const dbName = `pomelo_feedback_test_${randomUUID().replaceAll('-', '')}`;
    await mongoose.connect(process.env.FEEDBACK_TEST_MONGODB_URI, { dbName });
    t.after(async () => {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await Submission.init();
    process.env.AUTH_SECRET = randomUUID();
    const app = express();
    app.use(express.json());
    app.use('/api/test', require('../routes/contestRoutes'));
    app.use('/api/admin', require('../routes/adminRoutes'));
    const { requireAuth } = require('../middlewares/checkAuth');
    const { submissionLimiter } = require('../middlewares/rateLimiter');
    app.post('/code-quota', requireAuth(), submissionLimiter, (_req: unknown, res: any) => res.json({ success: true }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(() => new Promise<void>((resolve, reject) => server.close((error?: Error) => error ? reject(error) : resolve())));
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const { SignJWT } = await import('jose');
    const userId = new mongoose.Types.ObjectId();
    const otherId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    await User.create([
        { _id: userId, name: 'Candidate', email: 'candidate@example.test', passwordHash: 'unused', role: 'user' },
        { _id: otherId, name: 'Other candidate', email: 'other@example.test', passwordHash: 'unused', role: 'user' },
        { _id: adminId, name: 'Organizer', email: 'organizer@example.test', passwordHash: 'unused', role: 'admin' },
    ]);
    async function token(id: any, role = 'user') {
        return new SignJWT({ userId: String(id), role }).setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('5m').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    }
    const userToken = await token(userId);
    const otherToken = await token(otherId);
    const adminToken = await token(adminId, 'admin');
    const contest = await Contest.create({
        title: 'Feedback integration test', joinId: '123456', author: 'Test',
        startTime: new Date(Date.now() - 60000), endTime: new Date(Date.now() + 60000),
        durationMinutes: 30, questions: [],
    });
    await Submission.create({ contest: contest._id, user: userId });
    await Submission.create({ contest: contest._id, user: otherId, status: 'Completed' });
    const path = `/api/test/${contest._id}/feedback`;
    const adminPath = `/api/admin/tests/${contest._id}/feedback`;
    async function call(path: string, token?: string, body?: unknown) {
        const response = await fetch(`${baseUrl}${path}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, data: await response.json() as any };
    }

    await t.test('anonymous and non-admin callers cannot access protected data', async () => {
        assert.equal((await call(path)).status, 401);
        assert.equal((await call(path, undefined, { difficulty: 3, experience: 3 })).status, 401);
        assert.equal((await call(adminPath, userToken)).status, 403);
        assert.equal((await call(path, adminToken)).status, 404);
        assert.equal((await call('/api/test/not-an-id/feedback', userToken)).status, 400);
        assert.equal((await call('/api/admin/tests/not-an-id/feedback', adminToken)).status, 400);
    });
    await t.test('feedback requires a completed attempt', async () => {
        assert.equal((await call(path, userToken)).status, 403);
        assert.equal((await call(path, userToken, { difficulty: 2, experience: 4 })).status, 403);
        assert.equal((await call(`/api/test/${contest._id}/end`, userToken, {})).status, 200);
        assert.equal((await call(path, userToken)).data.feedback, null);
    });
    await t.test('invalid ratings, oversized comments and client-supplied identity are rejected', async () => {
        for (const body of [
            { difficulty: 6, experience: 4 },
            { difficulty: 2, experience: 4, comment: 'x'.repeat(2001) },
            { difficulty: 2, experience: 4, user: String(otherId) },
        ]) assert.equal((await call(path, userToken, body)).status, 400);
    });
    await t.test('concurrent requests save once without changing the completed attempt', async () => {
        const feedback = { difficulty: 2, experience: 4, comment: '  Clear questions\n<script>alert(1)</script>  ' };
        const before = await Submission.findOne({ contest: contest._id, user: userId }).lean();
        const results = await Promise.all([call(path, userToken, feedback), call(path, userToken, feedback)]);
        assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
        assert.equal(results.find(result => result.status === 409)?.data.alreadySubmitted, true);
        const after = await Submission.findById(before._id).lean();
        assert.equal(after.status, 'Completed');
        assert.equal(after.submittedAt.getTime(), before.submittedAt.getTime());
        assert.equal(after.totalScore, before.totalScore);
        assert.equal(after.feedback.comment, feedback.comment.trim());
        assert.equal((await call(path, userToken)).data.feedback.difficulty, 2);
    });
    await t.test('another user has independent feedback, including ratings without comments', async () => {
        assert.equal((await call(path, otherToken)).data.feedback, null);
        assert.equal((await call(path, otherToken, { difficulty: 4, experience: 2 })).status, 201);
        assert.equal((await call(path, otherToken)).data.feedback.comment, '');
    });
    await t.test('code-submission rate limits do not block feedback', async () => {
        for (let i = 0; i < 10; i++) assert.equal((await call('/code-quota', otherToken, {})).status, 200);
        assert.equal((await call('/code-quota', otherToken, {})).status, 429);
        assert.equal((await call(path, otherToken, { difficulty: 3, experience: 3 })).status, 409);
    });
    await t.test('averages cover every response while reviews paginate independently', async () => {
        await Submission.insertMany(Array.from({ length: 11 }, (_, i) => ({
            contest: contest._id, user: new mongoose.Types.ObjectId(), status: 'Completed',
            feedback: { difficulty: 3, experience: 3, comment: `Comment ${i}` },
        })));
        const first = (await call(`${adminPath}?page=1&limit=10`, adminToken)).data;
        const second = (await call(`${adminPath}?page=2&limit=10`, adminToken)).data;
        assert.equal(first.count, 13);
        assert.equal(first.averageDifficulty, 3);
        assert.equal(first.averageExperience, 3);
        assert.equal(first.totalReviews, 13);
        assert.equal(first.reviews.length, 10);
        assert.equal(second.reviews.length, 3);
        assert.equal(second.count, first.count);
        assert.equal(new Set([...first.reviews, ...second.reviews].map(row => row._id)).size, 13);
        assert.deepEqual(Object.keys(first.reviews[0]).sort(), ['_id', 'feedback']);
    });
    await t.test('distributions and averages remain global while rating filters combine and paginate', async () => {
        const filtered = (await call(`${adminPath}?difficulty=3&experience=3&page=2&limit=10`, adminToken)).data;
        assert.equal(filtered.count, 13);
        assert.equal(filtered.totalReviews, 11);
        assert.equal(filtered.reviews.length, 1);
        assert.equal(filtered.reviews[0].feedback.difficulty, 3);
        assert.deepEqual(filtered.difficultyDistribution.map((row: { count: number }) => row.count), [0, 1, 11, 1, 0]);
        assert.deepEqual(filtered.experienceDistribution.map((row: { count: number }) => row.count), [0, 1, 11, 1, 0]);
        const empty = (await call(`${adminPath}?difficulty=3&experience=4`, adminToken)).data;
        assert.equal(empty.totalReviews, 0);
        assert.equal(empty.reviews.length, 0);
        assert.equal(empty.count, 13);
    });
    await t.test('reviews sort by either rating in both directions', async () => {
        for (const [sort, field, expected] of [
            ['difficulty-high', 'difficulty', 4], ['difficulty-low', 'difficulty', 2],
            ['experience-high', 'experience', 4], ['experience-low', 'experience', 2],
        ] as const) {
            const result = await call(`${adminPath}?sort=${sort}`, adminToken);
            assert.equal(result.status, 200);
            assert.equal(result.data.reviews[0].feedback[field], expected);
        }
        for (const sort of ['newest', 'oldest']) {
            const data = (await call(`${adminPath}?sort=${sort}&limit=100`, adminToken)).data;
            const times = data.reviews.map((row: { feedback: { submittedAt: string } }) => new Date(row.feedback.submittedAt).getTime());
            assert.deepEqual(times, [...times].sort((a, b) => sort === 'oldest' ? a - b : b - a));
        }
    });
    await t.test('invalid filters and sort values return a client error', async () => {
        for (const query of ['difficulty=0', 'experience=6', 'difficulty=1&difficulty=2', 'sort=constructor']) {
            assert.equal((await call(`${adminPath}?${query}`, adminToken)).status, 400);
        }
    });
    await t.test('closed tests still accept optional feedback from completed attempts', async () => {
        await Contest.updateOne({ _id: contest._id }, { $set: { status: 'ended', endTime: new Date(Date.now() - 1000) } });
        assert.equal((await call(path, userToken)).status, 200);
        await Submission.create({ contest: contest._id, user: adminId, status: 'Completed' });
        assert.equal((await call(path, adminToken, { difficulty: 3, experience: 3 })).status, 201);
    });
    await t.test('a demoted organizer loses feedback access even with an existing admin token', async () => {
        await User.updateOne({ _id: adminId }, { $set: { role: 'user' } });
        assert.equal((await call(adminPath, adminToken)).status, 403);
    });
});
