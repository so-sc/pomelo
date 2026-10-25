const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const { getOrSet } = require('../utils/simpleCache');
const { isManuallyEnded, attemptDeadline } = require('../utils/contestTime');
const { finalizeExpiredAttempts } = require('../utils/expireAttempts');

const CONTEST_TTL_MS = 60 * 60_000;

/**
 * Middleware to validate contest access
 * @param {Object} options Configuration options
 * @param {boolean} options.checkStarted - Verify if the contest has started
 * @param {boolean} options.checkEnded - Verify if the contest has ended
 * @param {boolean} options.requireAttempt - Require a started attempt (requires auth middleware first)
 * @param {string} options.checkAttemptStatus - 'NotCompleted' (blocks if completed)
 */
const validateContest = (options = {}) => async (req, res, next) => {
    try {
        // Get contestId from params or body
        const contestId = req.params.id || req.body.contestId || req.params.contestId;

        if (!contestId) {
            return res.status(400).json({ success: false, error: 'Contest ID is required' });
        }

        if (typeof contestId !== 'string' || !mongoose.isValidObjectId(contestId)) {
            return res.status(400).json({ success: false, error: 'Invalid contest ID' });
        }

        // The doc carries its question snapshots now, so one read serves a whole
        // sitting. Every contest mutation invalidates this key.
        const contest = await getOrSet(`contest:${contestId}`, () => Contest.findById(contestId).lean(), CONTEST_TTL_MS);
        if (!contest) {
            return res.status(404).json({ success: false, error: 'Contest not found' });
        }

        const now = new Date();
        const startTime = new Date(contest.startTime);
        const endTime = new Date(contest.endTime);

        if (options.checkStarted && now < startTime) {
            return res.status(403).json({ success: false, error: 'Contest has not started yet' });
        }

        // Fetch the user's submission once, shared by checkEnded (personal deadline)
        // and checkAttemptStatus below — avoids a duplicate query.
        let submission = null;
        if ((options.checkEnded || options.checkAttemptStatus || options.requireAttempt) && req.user) {
            const userId = req.user.id;
            // Runs on every attempt request: skip the bulky per-test-case results and
            // don't hydrate, since every consumer only reads it.
            submission = await Submission.findOne({ contest: contest._id, user: userId })
                .select('-submissions.testCaseResults')
                .lean();
        }

        if (options.checkEnded) {
            // An active (not yet completed) attempt gets its own deadline —
            // startedAt + the contest's per-user duration — instead of the
            // shared join-window endTime, so a late starter isn't cut off
            // early. No submission yet (or already Completed) falls back to
            // the join-window cutoff.
            //
            // Deliberately NOT capped at endTime: someone who starts just before the
            // join window closes still gets their full duration, which means an attempt
            // can legitimately run past the contest's advertised end. This is the chosen
            // policy — don't "fix" it into min(startedAt + duration, endTime) without
            // deciding that late joiners should get a shortened attempt instead.
            const activeSubmission = submission && submission.status !== 'Completed' ? submission : null;
            const deadline = activeSubmission
                ? attemptDeadline(contest, activeSubmission)
                : endTime;

            // A manual "End Test" blocks new/not-yet-started attempts but lets someone
            // already mid-attempt keep going until their own deadline — that's the
            // whole point of a "soft" end vs. force-ending (which completes every
            // Ongoing submission up front, so activeSubmission is null afterward).
            // The candidate's own time ran out without a submit (tab closed, network
            // dropped): complete it now, so they see it as submitted, not resumable.
            if (activeSubmission && now > deadline) {
                await finalizeExpiredAttempts(contest, now);
                return res.status(403).json({ success: false, isCompleted: true, error: 'Your time is up. The test has been submitted.' });
            }

            if ((isManuallyEnded(contest) && !activeSubmission) || now > deadline) {
                return res.status(403).json({ success: false, error: 'Contest has ended' });
            }
        }

        // The per-user clock starts at /start; without this, questions could be read
        // (and answered) before the timer runs.
        if (options.requireAttempt && !submission) {
            return res.status(403).json({ success: false, error: 'Start the test first' });
        }

        // Check Attempt Status
        if (options.checkAttemptStatus) {
            if (options.checkAttemptStatus === 'NotCompleted') {
                if (submission && submission.status === 'Completed') {
                    return res.status(403).json({
                        success: false,
                        isCompleted: true,
                        error: 'You have already completed this test.'
                    });
                }
            }
            // Attach submission to request to avoid re-fetching
            if (submission) req.submission = submission;
        }

        // Attach to request
        req.contest = contest;
        next();
    } catch (error) {
        console.error('Middleware Error:', error);
        return res.status(500).json({ success: false, error: 'Server error validating contest' });
    }
};

module.exports = { validateContest };
