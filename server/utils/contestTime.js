// One definition of a contest's timing rules, shared by the middleware and controllers.

const MINUTE_MS = 60000;
const ENDED_STATUSES = ['completed', 'ended'];

const durationMs = (contest) => (contest.durationMinutes || 0) * MINUTE_MS;

// Ended by an admin ("End Test" / force end), regardless of the time window.
const isManuallyEnded = (contest) => ENDED_STATUSES.includes((contest.status || '').toLowerCase());

// A started attempt's own deadline: startedAt + the per-user duration.
const attemptDeadline = (contest, submission) =>
    new Date(new Date(submission.startedAt).getTime() + durationMs(contest));

// A late joiner's personal deadline can run past endTime, so this is the last moment
// anyone can still be attempting.
const lastDeadline = (contest) => new Date(new Date(contest.endTime).getTime() + durationMs(contest));

// Join-window status shown in admin lists: a manual end wins, otherwise the window decides.
const contestStatus = (contest, now) => {
    if (isManuallyEnded(contest) || now > new Date(contest.endTime)) return 'completed';
    if (now >= new Date(contest.startTime)) return 'ongoing';
    return 'waiting';
};

module.exports = { ENDED_STATUSES, durationMs, isManuallyEnded, attemptDeadline, lastDeadline, contestStatus };
