const Submission = require("../models/Submissions");
const Contest = require("../models/Contest");
const { languageIds } = require("../utils/languages");
const { getJudge, serializeValues, validateValues } = require("@pomelo/code-gen");

const resolveContestFromRequest = async (req) => {
    const contestId = req.params.id || req.body.contestId || req.contest?._id;
    if (!contestId) return { contestId: null, contest: null };
    if (req.contest) return { contestId, contest: req.contest };

    const contest = await Contest.findById(contestId).lean();
    return { contestId, contest };
};

const findContestQuestion = (contest, questionId) =>
    (contest?.questions || []).find((q) => String(q._id) === String(questionId));

// Helper function to remove trailing whitespace/newlines from output
const removeTrailingLineCommands = (output) => {
    if (typeof output !== 'string') return output;
    return output.replace(/\s+$/g, '');
};

// Sits above citron's own 15s queue + 30s execution deadline so citron times out first.
const CITRON_TIMEOUT_MS = 60000;

// Citron returns 503 when busy instead of queueing, so that's worth a retry.
const CITRON_RETRY_DELAYS_MS = [500, 1500, 3000];

const decodeBase64 = (value) => (value ? Buffer.from(value, "base64").toString("utf-8") : "");

// 64KB comfortably covers any real solution.
const MAX_CODE_LENGTH = 65536;

// Serializes one test case's input into stdin: values in declared order, arrays as length + elements.
const buildStdin = (question, tc) => {
    if (typeof tc.input === "object" && tc.input !== null) {
        const variables = question.inputVariables || [];
        const errors = validateValues(tc.input, variables);
        if (errors.length > 0) {
            throw new Error(errors.map((e) => e.message).join("; "));
        }
        return serializeValues(tc.input, variables);
    }
    if (typeof tc.input === "string") {
        return tc.input.trim().replace(/,/g, " ").replace(/\s+/g, " ");
    }
    return String(tc.input ?? "");
};

// Collapses citron's specific verdicts (e.g. "Runtime Error (SIGSEGV)") onto the schema's enum.
const normalizeSubmissionStatus = (status) => {
    if (!status || status === "Unknown") return "System Error";
    if (status === "Accepted") return "Accepted";
    if (status.includes("Compilation")) return "Compilation Error";
    if (status.includes("Time Limit")) return "Time Limit Exceeded";
    if (status.startsWith("Runtime Error") || status.includes("Internal Error")) return "Runtime Error";
    if (status.includes("System Error")) return "System Error";
    return "Wrong Answer";
};

// Posts a whole submission to citron, retrying only while it reports overload.
const postSubmission = async (payload) => {
    const citronUrl = process.env.CITRON_URL || "http://localhost:2358";
    const headers = { "Content-Type": "application/json" };
    if (process.env.CITRON_TOKEN) headers["X-Judge-Token"] = process.env.CITRON_TOKEN;

    for (let attempt = 0; ; attempt++) {
        const response = await fetch(`${citronUrl}/submissions?base64_encoded=true`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(CITRON_TIMEOUT_MS),
        });

        if (response.status === 503 && attempt < CITRON_RETRY_DELAYS_MS.length) {
            await new Promise((resolve) => setTimeout(resolve, CITRON_RETRY_DELAYS_MS[attempt]));
            continue;
        }
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            const error = new Error(body.error || `citron returned ${response.status}`);
            error.citronStatus = response.status;
            throw error;
        }
        return response.json();
    }
};

// Runs every test case of one submission in a single citron request.
const executeTestCases = async ({ question, code, language, testCases, languageId, onProgress }) => {
    // One entry per test case even on early failure, so scoring/client counts stay in sync.
    // systemFault means "we could not run the code" — callers must not grade or persist it.
    const failAllRaw = (status, error) => testCases.map((tc, index) => ({
        testCase: index + 1,
        passed: false,
        status,
        error,
        systemFault: true,
        isVisible: tc.isVisible === true,
    }));

    let prepared;
    try {
        prepared = testCases.map((tc) => ({
            stdin: buildStdin(question, tc),
            expectedOutput: removeTrailingLineCommands(String(tc.output ?? "").trim()),
            isVisible: tc.isVisible === true,
        }));
    } catch (err) {
        return failAllRaw("System Error", `This question's test data is misconfigured: ${err.message}`);
    }

    const failAll = (status, error) => prepared.map((tc, index) => ({
        testCase: index + 1,
        passed: false,
        status,
        error,
        systemFault: true,
        isVisible: tc.isVisible,
    }));

    let wrappedCode;
    try {
        const judge = getJudge(language.toLowerCase());
        const problemConfig = {
            method: question.functionName || 'solve',
            input: (question.inputVariables || []).map(v => ({
                variable: v.variable,
                type: v.type
            }))
        };
        wrappedCode = judge.wrapCode(code, problemConfig);
    } catch (err) {
        return failAll("System Error", `Could not prepare code for execution: ${err.message}`);
    }

    let submission;
    try {
        submission = await postSubmission({
            language_id: languageId,
            source_code: Buffer.from(wrappedCode).toString("base64"),
            testcases: prepared.map((tc) => ({
                stdin: Buffer.from(tc.stdin).toString("base64"),
                expected_output: Buffer.from(tc.expectedOutput).toString("base64"),
            })),
        });
    } catch (err) {
        if (err.name === "TimeoutError") {
            // The engine not answering is not the candidate's program hitting its CPU limit.
            return failAll("System Error", "The execution engine did not respond in time");
        }
        if (err.citronStatus === 503) {
            return failAll("System Error", "The execution engine is busy. Please try again in a moment.");
        }
        return failAll("System Error", err.message);
    }

    const compileOutput = decodeBase64(submission.compile?.output);
    const compileFailed = submission.compile && !submission.compile.skipped && !submission.compile.success;

    const results = prepared.map((tc, index) => {
        const result = (submission.testcases || []).find((r) => r.index === index);
        if (!result) {
            return {
                testCase: index + 1,
                passed: false,
                status: compileFailed ? "Compilation Error" : "System Error",
                error: compileFailed ? compileOutput : "No result was returned for this test case",
                isVisible: tc.isVisible,
            };
        }

        const status = result.status?.description || "Unknown";
        const stdout = decodeBase64(result.stdout);
        const stderr = decodeBase64(result.stderr);

        const passed = result.status?.id === 3;
        if (passed !== (normalizeSubmissionStatus(status) === "Accepted")) {
            console.warn(`citron status mismatch on test ${index + 1}: id=${result.status?.id} description="${status}"`);
        }

        return {
            testCase: index + 1,
            passed,
            input: tc.stdin,
            expectedOutput: tc.expectedOutput,
            actualOutput: removeTrailingLineCommands(stdout),
            error: stderr || compileOutput || status,
            status,
            executionTime: result.cpu_time_ms ?? result.wall_time_ms,
            memoryUsed: result.memory_kb,
            isVisible: tc.isVisible,
        };
    });

    onProgress?.(results.length, results.length);
    return results;
};

// How much of a test case result may cross the wire. FULL exposes hidden test
// data and is only ever legal on an admin-authenticated route.
const DISCLOSURE = Object.freeze({
    SUMMARY: "summary",
    VISIBLE: "visible",
    FULL: "full",
});

const summarize = (result) => ({
    testCase: result.testCase,
    passed: result.passed,
    status: result.status,
    isVisible: result.isVisible,
});

const projectResults = (results, disclosure) => {
    if (disclosure === DISCLOSURE.FULL) return results;
    if (disclosure === DISCLOSURE.VISIBLE) {
        return results.map(r => (r.isVisible === true ? r : summarize(r)));
    }
    return results.map(summarize);
};

const streamExecution = async (res, { question, code, language, languageId, testCases, disclosure, buildDone }) => {
    if (!Object.values(DISCLOSURE).includes(disclosure)) {
        throw new Error(
            `streamExecution requires an explicit disclosure level (${Object.values(DISCLOSURE).join(", ")}), got ${JSON.stringify(disclosure)}`
        );
    }

    res.writeHead(200, {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no"
    });
    // Keeps proxies from treating the connection as idle while the batch runs.
    res.write(JSON.stringify({ type: "progress", completed: 0, total: testCases.length }) + "\n");

    const results = await executeTestCases({
        question,
        code,
        language,
        testCases,
        languageId,
        onProgress: (completed, total) => {
            res.write(JSON.stringify({ type: "progress", completed, total }) + "\n");
        }
    });

    const done = await buildDone(results);

    // Single chokepoint: nothing reaches the client without passing the projection.
    const wire = Array.isArray(done.results)
        ? { ...done, results: projectResults(done.results, disclosure) }
        : done;

    res.write(JSON.stringify({ type: "done", success: true, ...wire }) + "\n");
    res.end();
};

const scoreResults = (question, results) => {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const score = totalCount > 0 ? Math.floor((passedCount / totalCount) * (question.marks || 0)) : 0;

    // The worst test case decides the submission's overall status.
    let overallStatus = "Accepted";
    if (passedCount < totalCount) {
        const ranking = ["Compilation Error", "System Error", "Time Limit Exceeded", "Runtime Error", "Wrong Answer"];
        const seen = results.map(r => normalizeSubmissionStatus(r.status));
        overallStatus = ranking.find(status => seen.includes(status)) || "Wrong Answer";
    }

    // Slowest and heaviest test case: what the submission actually cost to run.
    const executionTime = results.reduce((max, r) => Math.max(max, r.executionTime || 0), 0);
    const memoryUsed = results.reduce((max, r) => Math.max(max, r.memoryUsed || 0), 0);

    return { passedCount, totalCount, score, overallStatus, executionTime, memoryUsed };
};

// Persists one question's entry atomically, avoiding a read-then-write race.
// keepBest (coding): graded fields are replaced only by an equal or better attempt, so a
// resubmit can't cost marks; last* keeps the most recent code. Default (MCQ): last wins.
const saveSubmissionEntry = async (contestId, userId, questionId, entry, { keepBest = false } = {}) => {
    const match = keepBest
        ? { contest: contestId, user: userId, submissions: { $elemMatch: { question: questionId, score: { $lte: entry.score || 0 } } } }
        : { contest: contestId, user: userId, "submissions.question": questionId };

    const replaceEntry = () => Submission.findOneAndUpdate(
        match,
        { $set: { "submissions.$": entry } },
        { returnDocument: "after", runValidators: true }
    );

    const recordLatestOnly = () => Submission.findOneAndUpdate(
        { contest: contestId, user: userId, "submissions.question": questionId },
        {
            $set: {
                "submissions.$.lastCode": entry.code,
                "submissions.$.lastLanguage": entry.language,
                "submissions.$.lastSubmittedAt": entry.submittedAt || new Date(),
            },
        },
        { returnDocument: "after", runValidators: true }
    );

    const appendEntry = (options = {}) => Submission.findOneAndUpdate(
        { contest: contestId, user: userId },
        { $push: { submissions: entry } },
        { returnDocument: "after", runValidators: true, ...options }
    );

    let doc = await replaceEntry();

    if (!doc && keepBest) doc = await recordLatestOnly();

    if (!doc) {
        try {
            doc = await appendEntry({ upsert: true });
        } catch (err) {
            if (err.code !== 11000) throw err;
            // Lost the create race — retry now that the doc exists.
            doc = (await replaceEntry()) || (keepBest && await recordLatestOnly()) || (await appendEntry());
        }
    }

    // Recomputed server-side so concurrent submissions can't clobber each other.
    await Submission.updateOne(
        { _id: doc._id },
        [{ $set: { totalScore: { $sum: "$submissions.score" } } }],
        { updatePipeline: true }
    );
};

// @desc    Run code against visible test cases only
const runCode = async (req, res, next) => {
    try {
        const { questionId, language, isBase64 } = req.body;
        let { code } = req.body;
        
        if (isBase64 && code) {
            code = Buffer.from(code, 'base64').toString('utf-8');
        }

        if (!questionId || !code || !language) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        if (typeof questionId !== "string") {
            return res.status(400).json({ success: false, error: "Invalid questionId" });
        }

        if (code.length > MAX_CODE_LENGTH) {
            return res.status(400).json({ success: false, error: "Code exceeds maximum allowed length" });
        }

        const { contestId, contest } = await resolveContestFromRequest(req);
        if (!contestId) {
            return res.status(400).json({ success: false, error: "Missing contestId" });
        }
        if (!contest) {
            return res.status(404).json({ success: false, error: "Contest not found" });
        }

        const question = findContestQuestion(contest, questionId);
        if (!question) return res.status(404).json({ success: false, error: "Question not found in this test" });

        const languageId = languageIds[language.toLowerCase()];
        if (!languageId) return res.status(400).json({ success: false, error: "Unsupported language" });

        const visibleTestCases = (Array.isArray(question.testcases) ? question.testcases : []).filter(tc => tc.isVisible);

        // If no testcases are marked visible, take the first one as a fallback for user feedback
        const testToRun = visibleTestCases.length > 0 ? visibleTestCases : (question.testcases?.[0] ? [question.testcases[0]] : []);

        if (testToRun.length === 0) {
            return res.status(400).json({ success: false, error: "No test cases configured" });
        }

        await streamExecution(res, {
            question,
            code,
            language,
            languageId,
            testCases: testToRun,
            disclosure: DISCLOSURE.VISIBLE,
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

// @desc    Submit code and save results
const submitCode = async (req, res, next) => {
    try {
        const { questionId, language, isBase64 } = req.body;
        let { code } = req.body;
        
        if (isBase64 && code) {
            code = Buffer.from(code, 'base64').toString('utf-8');
        }

        const userId = req.user.id || req.user._id || req.user.sub;
        const { contestId, contest } = await resolveContestFromRequest(req);
        // contestId is validated by validateContest middleware, mounted on /:id.

        if (!contestId || !questionId || !code || !language) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (typeof questionId !== "string") {
            return res.status(400).json({ error: "Invalid questionId" });
        }

        if (code.length > MAX_CODE_LENGTH) {
            return res.status(400).json({ error: "Code exceeds maximum allowed length" });
        }

        if (!contest) {
            return res.status(404).json({ error: "Contest not found" });
        }

        const question = findContestQuestion(contest, questionId);
        if (!question) return res.status(404).json({ error: "Question not found in this test" });

        const languageId = languageIds[language.toLowerCase()];
        if (!languageId) return res.status(400).json({ error: "Unsupported language" });

        // Submit runs against ALL test cases for scoring
        const allTestCases = Array.isArray(question.testcases) ? question.testcases : [];
        if (allTestCases.length === 0) {
            return res.status(400).json({ error: "No test cases configured" });
        }

        await streamExecution(res, {
            question,
            code,
            language,
            languageId,
            testCases: allTestCases,
            disclosure: DISCLOSURE.SUMMARY,
            buildDone: async (results) => {
                // Grading an engine failure would write a 0 over a stored pass.
                if (results.some((r) => r.systemFault)) {
                    return {
                        results,
                        success: false,
                        systemFault: true,
                        error: results[0]?.error || "The execution engine is unavailable",
                    };
                }

                const { score, overallStatus, executionTime, memoryUsed } = scoreResults(question, results);

                await saveSubmissionEntry(contestId, userId, questionId, {
                    question: questionId,
                    code,
                    language,
                    status: overallStatus,
                    score,
                    testCaseResults: results,
                    executionTime,
                    memoryUsed,
                    submittedAt: new Date(),
                    lastCode: code,
                    lastLanguage: language,
                    lastSubmittedAt: new Date()
                }, { keepBest: true });

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

// Save MCQ answer
const saveMCQ = async (req, res, next) => {
    try {
        const { questionId, answer } = req.body;
        const userId = req.user.id || req.user._id || req.user.sub;

        const { contestId, contest } = await resolveContestFromRequest(req);

        if (!contestId || !questionId) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (typeof questionId !== "string") {
            return res.status(400).json({ error: "Invalid questionId" });
        }

        if (!contest) return res.status(404).json({ error: "Contest not found" });

        const questionDoc = findContestQuestion(contest, questionId);
        if (!questionDoc) return res.status(404).json({ error: "Question not found in this test" });

        let score = 0;
        const submittedAnswers = Array.isArray(answer) ? answer : [answer];

        // correctAnswer in DB is a string of indices, e.g., "0" or "0,2"
        const correctIndices = (questionDoc.correctAnswer || '').split(',')
            .map(idx => parseInt(idx.trim(), 10))
            .filter(n => !isNaN(n));
        const correctTexts = correctIndices.map(idx => questionDoc.options[idx]).filter(Boolean);

        const isMultiple = questionDoc.questionType === "Multiple Correct";

        if (isMultiple) {
            // All correct answers must be present and no incorrect ones
            const isCorrect = submittedAnswers.length === correctTexts.length &&
                submittedAnswers.every(ans => correctTexts.includes(ans));
            if (isCorrect) score = questionDoc.marks || 0;
        } else {
            // Single correct
            if (submittedAnswers.includes(correctTexts[0])) {
                score = questionDoc.marks || 0;
            }
        }

        const entry = {
            question: questionId,
            answer: Array.isArray(answer) ? answer : [answer],
            score: Math.floor(score),
            submittedAt: new Date()
        };

        // Auto-saves overlap, so this must not rewrite the whole submissions array.
        await saveSubmissionEntry(contestId, userId, questionId, entry);

        return res.status(200).json({ success: true, score });
    } catch (error) {
        next(error);
    }
};

// executeTestCases is exported to exercise the execution path without Express/Mongo/auth.
module.exports = { saveMCQ, submitCode, runCode, findContestQuestion, executeTestCases, saveSubmissionEntry, streamExecution, scoreResults, projectResults, DISCLOSURE, MAX_CODE_LENGTH };
