const Question = require('../models/Question');

/**
 * Fetches questions by id, preserving the order of `ids`.
 *
 * Mongo returns $in matches in natural order, not the order of the id list, so
 * a plain Question.find({_id: {$in: contest.questions}}) silently discards the
 * order the admin arranged the test in. Ids with no surviving question (deletion
 * has no cascade) are dropped rather than left as holes.
 */
const findQuestionsInOrder = async (ids = [], { lean = false } = {}) => {
    const query = Question.find({ _id: { $in: ids } });
    const questions = await (lean ? query.lean() : query);

    const byId = new Map(questions.map((q) => [q._id.toString(), q]));
    return ids.map((id) => byId.get(id.toString())).filter(Boolean);
};

module.exports = { findQuestionsInOrder };
