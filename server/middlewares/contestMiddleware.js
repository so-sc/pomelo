const mongoose = require('mongoose');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const { getOrSet } = require('../utils/simpleCache');

const CONTEST_TTL_MS = 60 * 60_000;

/**
 * Middleware to validate contest access
 * @param {Object} options Configuration options
 * @param {boolean} options.checkStarted - Verify if the contest has started
 * @param {boolean} options.checkEnded - Verify if the contest has ended
 * @param {boolean} options.checkRegistered - Verify if user is registered (requires auth middleware first)
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

        // Check if contest is manually marked as Completed/Ended or Time is up
        const status = contest.status ? contest.status.toLowerCase() : '';
        const isManuallyEnded = status === 'completed' || status === 'ended';

        // Fetch the user's submission once, shared by checkEnded (personal deadline)
        // and checkAttemptStatus below — avoids a duplicate query.
        let submission = null;
        if ((options.checkEnded || options.checkAttemptStatus) && req.user) {
            const userId = req.user.id || req.user._id || req.user.sub;
            submission = await Submission.findOne({ contest: contest._id, user: userId });
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
                ? new Date(activeSubmission.startedAt.getTime() + (contest.durationMinutes || 0) * 60000)
                : endTime;

            // A manual "End Test" blocks new/not-yet-started attempts but lets someone
            // already mid-attempt keep going until their own deadline — that's the
            // whole point of a "soft" end vs. force-ending (which completes every
            // Ongoing submission up front, so activeSubmission is null afterward).
            if ((isManuallyEnded && !activeSubmission) || now > deadline) {
                return res.status(403).json({ success: false, error: 'Contest has ended' });
            }
        }

        // Optional: Check registration if user is attached (auth middleware expected)
        if (options.checkRegistered && req.user) {
            const userId = req.user.id || req.user._id || req.user.sub;
            // Assuming registeredContests is on user or we check submission/registration model
            // For now, let's keep it simple or check the local user object if populated
            // But usually registration check might be separate or part of the "start" logic
            // We'll leave strict registration check to the controller or specific middleware if needed
            // to avoid circular dependency or complex user fetching here if not already done.
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
