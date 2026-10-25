const Contest = require('../models/Contest');
const User = require('../models/User');
const Submission = require('../models/Submissions');
const { z } = require('zod');
const { toProblemView } = require('../utils/toProblemView');
const { isManuallyEnded, attemptDeadline, lastDeadline } = require('../utils/contestTime');
const { orderQuestionsFor } = require('../utils/questionOrder');
const { finalizeExpiredAttempts } = require('../utils/expireAttempts');

// Stands in for "no submittedAt" so Ongoing entries sort last, matching the
// Infinity the old in-memory comparator used.
const LEADERBOARD_SORT_SENTINEL = new Date('9999-12-31T23:59:59.999Z');

// @desc    Validate 6-digit Join ID (OTP)
// @route   POST /api/contest/validate
// @access  Public
const validateJoinId = async (req, res, next) => {
    try {
        const { joinId } = req.body;

        if (typeof joinId !== 'string' || !/^\d{6}$/.test(joinId.trim())) {
            return res.status(400).json({
                success: false,
                error: "Join ID must be a 6-digit code."
            });
        }

        // Search the database for the 6-digit joinCode
        const contest = await Contest.findOne({ joinId: joinId.trim() });

        if (!contest) {
            return res.status(404).json({
                success: false,
                error: "Invalid Join ID. No test found with this code."
            });
        }

        // Return needed info for redirect
        return res.status(200).json({
            success: true,
            contestId: contest._id,
            title: contest.title
        });
    } catch (error) {
        return next(error);
    }
};

// @desc    Get contest landing details
const getContestLanding = async (req, res, next) => {
    try {
        const contest = req.contest;
        const now = new Date();
        const start = new Date(contest.startTime);
        const canStart = now >= start && now <= new Date(contest.endTime) && !isManuallyEnded(contest);

        return res.json({
            success: true,
            data: {
                title: contest.title,
                description: contest.description,
                duration: contest.durationMinutes, // min
                startTime: contest.startTime,
                endTime: contest.endTime,
                serverTime: now,
                canStart: canStart,
                isEnded: isManuallyEnded(contest) || now > new Date(contest.endTime), // Pass ended status
                totalProblems: contest.questions.length,
                author: contest.author || "SCEM Coding Club",
                rules: contest.rules || []
            }
        });
    } catch (error) {
        return next(error);
    }
};

// @desc    Get contest data for attempt
const getContestData = async (req, res, next) => {
    try {
        const contest = req.contest;

        // In the candidate's own order when the test shuffles questions.
        const questions = orderQuestionsFor(contest, req.user.id);

        // Fetch User Submission to get saved state
        // Middleware likely attached submission
        const submission = req.submission || await Submission.findOne({ contest: contest._id, user: req.user.id });

        const answerMap = {}; // Map questionId -> { answer, code }
        if (submission && submission.submissions) {
            submission.submissions.forEach(s => {
                if (s.question) {
                    answerMap[s.question.toString()] = {
                        answer: s.answer,
                        // Latest code, not the best-scoring copy, so a reload never
                        // replaces what the candidate was last working on.
                        code: s.lastCode ?? s.code,
                        language: s.lastLanguage ?? s.language
                    };
                }
            });
        }

        const deadline = submission ? attemptDeadline(contest, submission) : new Date(contest.endTime);
        const timeRemaining = Math.max(0, (deadline - new Date()) / 1000);

        // Optional ?qid= trims every other question down to {id, type} —
        // callers that only render one question (e.g. the question page)
        // don't need every question's full description/testcases/boilerplate.
        const { qid } = req.query;

        return res.json({
            success: true,
            data: {
                contestId: contest._id,
                title: contest.title,
                timeRemaining,
                problems: questions.map(q => {
                    const id = q._id.toString();
                    if (qid && qid !== id) {
                        return { id: q._id, type: q.type };
                    }
                    return toProblemView(q, { saved: answerMap[id] });
                })
            }
        });
    } catch (error) {
        return next(error);
    }
};

// @desc    Start test (User Attempt)
const startTest = async (req, res, next) => {
    try {
        const contest = req.contest;
        const userId = req.user.id;

        const contestId = contest._id;

        const now = new Date();

        const user = await User.findById(userId);
        if (user && !user.registeredContests.includes(contestId)) {
            user.registeredContests.push(contestId);
            await user.save();
        }

        // Upsert, so two concurrent starts (double click, two tabs) share one attempt instead
        // of the second failing on the unique index. A Completed attempt never gets here:
        // the middleware's checkAttemptStatus already rejected it.
        const { value: submission, lastErrorObject } = await Submission.findOneAndUpdate(
            { contest: contestId, user: userId },
            { $setOnInsert: { status: 'Ongoing', startedAt: now } },
            { upsert: true, returnDocument: 'after', includeResultMetadata: true }
        );
        // The client keeps this browser's proctoring state when an attempt is resumed.
        const resumed = !lastErrorObject?.upserted;

        const deadline = attemptDeadline(contest, submission);

        return res.json({
            success: true,
            message: 'Test started successfully',
            data: {
                contestId: contest._id,
                title: contest.title,
                resumed,
                timeRemaining: Math.max(0, Math.floor((deadline - now) / 1000))
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get ranked leaderboard for a contest
// @route   GET /api/contest/:id/leaderboard
// @access  Private (Admin only)
const getLeaderboard = async (req, res, next) => {
    try {
        const contest = await Contest.findById(req.params.id)
            .select('title endTime durationMinutes status questions.marks')
            .lean();
        if (!contest) {
            return res.status(404).json({ success: false, error: 'Contest not found' });
        }
        // Results must count candidates whose time ran out without a submit.
        await finalizeExpiredAttempts(contest);

        const now = new Date();
        // A late joiner may still legitimately be attempting past endTime,
        // so wait for the last possible personal deadline before unlocking.
        const isEnded = now > lastDeadline(contest) || isManuallyEnded(contest);

        if (!isEnded) {
            return res.status(403).json({
                success: false,
                error: 'Leaderboard is not available until the contest ends.'
            });
        }


        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const skip = (page - 1) * limit;

        // Include both Completed and Ongoing submissions — participants whose time
        // expired without clicking "End Test" still have valid scores.
        const [totalParticipants, topEntry, rows] = await Promise.all([
            Submission.countDocuments({ contest: contest._id }),
            // Whole-set high score: reading it off page 1's first row would be wrong on page 2+.
            Submission.findOne({ contest: contest._id }).sort({ totalScore: -1 }).select('totalScore').lean(),
            Submission.aggregate([
                { $match: { contest: contest._id } },
                // Ongoing entries have no submittedAt. Mongo sorts missing values FIRST
                // ascending, so substitute a sentinel to keep them last, as before.
                { $addFields: { _sortTime: { $ifNull: ['$submittedAt', LEADERBOARD_SORT_SENTINEL] } } },
                // _id last: without a unique tiebreak, rows tied on score and time can
                // repeat on one page and vanish from another.
                { $sort: { totalScore: -1, _sortTime: 1, _id: 1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user',
                        foreignField: '_id',
                        as: 'user',
                        pipeline: [{ $project: { name: 1 } }], // name only — no email for privacy
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                { $project: { totalScore: 1, submittedAt: 1, status: 1, 'user.name': 1 } },
            ]),
        ]);

        const leaderboard = rows.map((sub, idx) => ({
            rank: skip + idx + 1,
            name: sub.user ? sub.user.name || 'Anonymous' : 'Anonymous',
            totalScore: sub.totalScore ?? 0,
            submittedAt: sub.submittedAt || null,
            status: sub.status  // 'Completed' | 'Ongoing' (time expired)
        }));

        return res.status(200).json({
            success: true,
            data: {
                contestId: contest._id,
                title: contest.title,
                endTime: contest.endTime,
                totalParticipants,
                topScore: topEntry?.totalScore ?? 0,
                maxScore: (contest.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0),
                leaderboard,
                page,
                limit
            }
        });
    } catch (error) {
        return next(error);
    }
};

// @desc    End Test (Mark as Completed)
const endTest = async (req, res, next) => {
    try {
        const contestId = req.params.id || req.body.contestId || (req.contest && req.contest._id);
        const userId = req.user.id;
        const { forcedSubmission = false, autoSubmitReason } = req.body || {};

        if (!contestId) {
            return res.status(400).json({ success: false, error: 'Contest ID is required' });
        }

        const forced = Boolean(forcedSubmission || autoSubmitReason);
        // Atomic and Ongoing-only, so a force-end or expiry that completes the attempt
        // first is never overwritten (and repeated calls can't move submittedAt).
        const completed = await Submission.findOneAndUpdate(
            { contest: contestId, user: userId, status: 'Ongoing' },
            { $set: {
                status: 'Completed',
                submittedAt: new Date(),
                forcedSubmission: forced,
                autoSubmitReason: forced ? autoSubmitReason || 'VIOLATION_LIMIT_REACHED' : undefined,
            } },
            { returnDocument: 'after' }
        ).lean();
        if (completed) {
            return res.json({ success: true, message: 'Test completed successfully', forcedSubmission: completed.forcedSubmission });
        }

        const submission = await Submission.findOne({ contest: contestId, user: userId }).select('status forcedSubmission').lean();

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission session not found. Did you start the test?' });
        }

        // Not Ongoing, so already Completed: submitting is one-time and the first end wins.
        return res.json({
            success: true,
            message: 'Test already submitted',
            forcedSubmission: Boolean(submission.forcedSubmission)
        });
    } catch (error) {
        next(error);
    }
};

const feedbackSchema = z.object({
    difficulty: z.number().int().min(1).max(5),
    experience: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional().default(''),
}).strict();

// Feedback remains available after the contest closes, but only for the caller's completed attempt.
const getFeedback = async (req, res, next) => {
    try {
        const attempt = await Submission.findOne({ contest: req.params.id, user: req.user.id })
            .select('status feedback').lean();
        if (!attempt) return res.status(404).json({ success: false, error: 'Test attempt not found' });
        if (attempt.status !== 'Completed') {
            return res.status(403).json({ success: false, error: 'Submit your test before leaving feedback' });
        }
        return res.json({ success: true, title: req.contest.title, feedback: attempt.feedback || null });
    } catch (error) {
        next(error);
    }
};

const submitFeedback = async (req, res, next) => {
    try {
        const parsed = feedbackSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: 'Choose ratings from 1 to 5 and keep comments within 2,000 characters.' });
        }

        // Atomic first-write wins: retries and concurrent requests cannot create duplicates or overwrite feedback.
        const attempt = await Submission.findOneAndUpdate({
            contest: req.params.id,
            user: req.user.id,
            status: 'Completed',
            feedback: { $exists: false },
        }, { $set: { feedback: { ...parsed.data, submittedAt: new Date() } } }, {
            returnDocument: 'after',
            runValidators: true,
        }).select('feedback');

        if (attempt) return res.status(201).json({ success: true, feedback: attempt.feedback });

        const existing = await Submission.findOne({ contest: req.params.id, user: req.user.id }).select('status').lean();
        if (!existing) return res.status(404).json({ success: false, error: 'Test attempt not found' });
        if (existing.status !== 'Completed') {
            return res.status(403).json({ success: false, error: 'Submit your test before leaving feedback' });
        }
        return res.status(409).json({ success: false, alreadySubmitted: true, error: 'Feedback has already been submitted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    validateJoinId,
    getContestLanding,
    getContestData,
    startTest,
    endTest,
    getLeaderboard,
    getFeedback,
    submitFeedback,
};
