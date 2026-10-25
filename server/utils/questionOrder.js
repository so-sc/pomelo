const crypto = require('crypto');

// A candidate's question sequence. With shuffleQuestions on, each question is ranked by
// a hash of (contest, user, question): different candidates get different orders, while
// one candidate's order is identical on every reload, tab or re-login, with nothing to
// store. Adding or removing a question leaves the others' relative order unchanged.
const orderQuestionsFor = (contest, userId) => {
    const questions = contest.questions || [];
    if (!contest.shuffleQuestions) return questions;

    const rank = (q) => crypto.createHash('sha256').update(`${contest._id}:${userId}:${q._id}`).digest('hex');
    return questions
        .map((q) => ({ q, key: rank(q) }))
        .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
        .map(({ q }) => q);
};

module.exports = { orderQuestionsFor };
