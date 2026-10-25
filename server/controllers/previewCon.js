const Question = require("../models/Question");
const { toProblemView } = require("../utils/toProblemView");
const {
    streamExecution,
    scoreResults,
    resolveExecutionRequest,
    runnableTestCases,
    DISCLOSURE,
} = require("./submitCon");

const resolveQuestion = async (req, res) => {
    const question = await Question.findById(req.params.id);
    if (!question) {
        res.status(404).json({ success: false, error: "Question not found" });
        return null;
    }
    return question;
};

// @desc    Question in the candidate-facing shape, for admin preview
const getQuestionPreview = async (req, res, next) => {
    try {
        const question = await resolveQuestion(req, res);
        if (!question) return;

        return res.json({
            success: true,
            problem: toProblemView(question, { includeAnswerKey: true }),
        });
    } catch (error) {
        return next(error);
    }
};

// @desc    Run preview code against visible test cases. Never persisted.
const runPreview = async (req, res, next) => {
    try {
        const question = await resolveQuestion(req, res);
        if (!question) return;

        const execution = resolveExecutionRequest(req, res);
        if (!execution) return;

        const testToRun = runnableTestCases(question);

        if (testToRun.length === 0) {
            return res.status(400).json({ success: false, error: "No test cases configured" });
        }

        await streamExecution(res, {
            question,
            ...execution,
            testCases: testToRun,
            disclosure: DISCLOSURE.FULL,
            buildDone: (results) => ({
                results,
                passedCount: results.filter(r => r.passed).length,
                totalCount: results.length
            })
        });
    } catch (error) {
        if (res.headersSent) {
            res.write(JSON.stringify({ type: "error", error: error.message }) + "\n");
            return res.end();
        }
        next(error);
    }
};

// @desc    Run preview code against all test cases and score it. Never persisted.
const submitPreview = async (req, res, next) => {
    try {
        const question = await resolveQuestion(req, res);
        if (!question) return;

        const execution = resolveExecutionRequest(req, res);
        if (!execution) return;

        const allTestCases = Array.isArray(question.testcases) ? question.testcases : [];
        if (allTestCases.length === 0) {
            return res.status(400).json({ success: false, error: "No test cases configured" });
        }

        await streamExecution(res, {
            question,
            ...execution,
            testCases: allTestCases,
            disclosure: DISCLOSURE.FULL,
            buildDone: (results) => {
                const { score, overallStatus } = scoreResults(question, results);
                return { results, score, overallStatus };
            }
        });
    } catch (error) {
        if (res.headersSent) {
            res.write(JSON.stringify({ type: "error", error: error.message }) + "\n");
            return res.end();
        }
        next(error);
    }
};

module.exports = { getQuestionPreview, runPreview, submitPreview };
