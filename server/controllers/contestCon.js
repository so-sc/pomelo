const Contest = require('../models/Contest');
const User = require('../models/User');
const Submission = require('../models/Submissions');
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
                isEnded: isManuallyEnded || now > new Date(contest.endTime), // Pass ended status
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
                        code: s.code,
                        language: s.language
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

        // Initialize Submission if not exists
        // Middleware might have attached submission
        let submission = req.submission;

        if (!submission) {
            submission = await Submission.findOne({ contest: contestId, user: userId });
        }

        if (!submission) {
            submission = new Submission({ contest: contestId, user: userId, status: 'Ongoing' });
            await submission.save();
        } else {
            // Middleware already checked if it was Completed and threw 403 if checkAttemptStatus was set
        }

        const deadline = attemptDeadline(contest, submission);

        return res.json({
            success: true,
            message: 'Test started successfully',
            data: {
                contestId: contest._id,
                title: contest.title,
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

        const submission = await Submission.findOne({ contest: contestId, user: userId });

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission session not found. Did you start the test?' });
        }

        // Submitting is one-time: the first end wins. Without this, a later call could
        // move submittedAt forward, and one with an empty body would clear the
        // forcedSubmission flag set by an integrity auto-submit.
        if (submission.status === 'Completed') {
            return res.json({
                success: true,
                message: 'Test already submitted',
                forcedSubmission: Boolean(submission.forcedSubmission)
            });
        }

        submission.status = 'Completed';
        submission.submittedAt = new Date();
        submission.forcedSubmission = Boolean(forcedSubmission || autoSubmitReason);
        submission.autoSubmitReason = submission.forcedSubmission ? autoSubmitReason || 'VIOLATION_LIMIT_REACHED' : undefined;
        await submission.save();

        return res.json({
            success: true,
            message: 'Test completed successfully',
            forcedSubmission: submission.forcedSubmission
        });
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
    getLeaderboard
};
