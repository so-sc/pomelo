const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const { durationMs } = require('./contestTime');

// Same reason the client timer sends when it auto-submits at zero.
const TIME_EXPIRED = 'TIME_EXPIRED';

// Completes every attempt in this contest whose own deadline (startedAt + duration) has
// passed, as if the timer had submitted it at that moment: candidates who closed the tab,
// lost power or dropped off the network still end up Completed with their saved answers.
const finalizeExpiredAttempts = (contest, now = new Date()) => {
    const ms = durationMs(contest);
    return Submission.updateMany(
        { contest: contest._id, status: 'Ongoing', startedAt: { $lte: new Date(now.getTime() - ms) } },
        [{
            $set: {
                status: 'Completed',
                submittedAt: { $add: ['$startedAt', ms] },
                forcedSubmission: true,
                autoSubmitReason: TIME_EXPIRED,
            },
        }],
        { updatePipeline: true }
    );
};

// Background pass over every contest that still has Ongoing attempts, so admin counts
// and stats catch up even when nobody opens that contest's results.
const sweepExpiredAttempts = async (now = new Date()) => {
    const contestIds = await Submission.distinct('contest', { status: 'Ongoing' });
    if (contestIds.length === 0) return;
    const contests = await Contest.find({ _id: { $in: contestIds } }).select('durationMinutes').lean();
    await Promise.all(contests.map((contest) => finalizeExpiredAttempts(contest, now)));
};

const SWEEP_INTERVAL_MS = 60_000;

const startExpirySweep = () => {
    const run = () => sweepExpiredAttempts().catch((err) => console.error('Expiry sweep failed:', err.message));
    run();
    setInterval(run, SWEEP_INTERVAL_MS).unref();
};

module.exports = { finalizeExpiredAttempts, sweepExpiredAttempts, startExpirySweep, TIME_EXPIRED };
