const Question = require('../models/Question');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const { connectDB } = require('../helpers/dbCon');
const { getJudge, validateProblemConfig } = require("@pomelo/code-gen");
const {
  exportSingleQuestion,
  exportBulkQuestions,
  exportPayloadToJSON,
  generateExportFilename,
  processImportJSON,
} = require("../utils/questionsIO");
const { invalidate } = require("../utils/simpleCache");
const { escapeRegex } = require("../utils/escapeRegex");
const { findQuestionsInOrder } = require("../utils/findQuestionsInOrder");

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const toNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};
const asArray = (value) => Array.isArray(value) ? value : [];

// --- Questions ---

// @desc Create a new problem
const createProblem = async (req, res, next) => {
    try {
        await connectDB();
        const {
            title, description, difficulty, marks,
            questionType, options, correctAnswer,
            constraints, inputFormat, outputFormat, testcases,
            type, // Extract Type
            functionName, inputVariables, // Extract new fields
            boilerplate // Frontend sends 'boilerplate'
        } = req.body;

        const isCoding = questionType === 'Coding' || type === 'coding';
        const isMcq = questionType === 'Single Correct' || questionType === 'Multiple Correct' || type === 'mcq';
        const marksNumber = toNumber(marks);

        if (!isNonEmptyString(title) || !isNonEmptyString(description) || !isNonEmptyString(difficulty)) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        if (marksNumber === null) {
            return res.status(400).json({ success: false, error: 'Invalid marks value' });
        }

        if (!isCoding && !isMcq) {
            return res.status(400).json({ success: false, error: 'Invalid question type' });
        }

        const safeOptions = asArray(options);
        const safeInputVariables = asArray(inputVariables);
        const safeTestcases = asArray(testcases);

        if (isCoding) {
            if (!Array.isArray(inputVariables)) {
                return res.status(400).json({ success: false, error: 'Input variables must be an array' });
            }
            const signatureErrors = validateProblemConfig({ method: functionName, input: safeInputVariables });
            if (signatureErrors.length > 0) {
                return res.status(400).json({ success: false, error: signatureErrors.join('; ') });
            }
        }

        if (isMcq) {
            if (!Array.isArray(options) || safeOptions.length < 2) {
                return res.status(400).json({ success: false, error: 'Options must be an array with at least two values' });
            }
            if (!(typeof correctAnswer === 'string' || Array.isArray(correctAnswer))) {
                return res.status(400).json({ success: false, error: 'Correct answer is required for MCQ' });
            }
        }

        // Map frontend 'boilerplate' to model 'boilerplateCode'
        let boilerplateCode = req.body.boilerplateCode || boilerplate;

        // Generate Boilerplate if Coding type
        if ((questionType === 'Coding' || type === 'coding') && boilerplateCode) {
            const method = functionName;
            const inputs = safeInputVariables.map(v => ({
                variable: v.variable,
                type: v.type // Correct access: flat structure
            }));

            // Iterate selected languages
            const supportedLangs = ['c', 'cpp', 'java', 'python'];

            // Remove unsupported languages from the object to prevent saving them
            Object.keys(boilerplateCode).forEach(key => {
                if (!supportedLangs.includes(key)) {
                    delete boilerplateCode[key];
                }
            });

            // A failure here would save the client's "// auto-generated" sentinel as the
            // candidate's stub, so surface it rather than persisting placeholder code.
            for (const lang of supportedLangs) {
                // Only generate if the user selected this language (sent as key in boilerplateCode)
                if (Object.prototype.hasOwnProperty.call(boilerplateCode, lang)) {
                    try {
                        boilerplateCode[lang] = getJudge(lang).generateBoilerplate({ method, input: inputs });
                    } catch (err) {
                        return res.status(400).json({ success: false, error: `Could not generate ${lang} boilerplate: ${err.message}` });
                    }
                }
            }
        }

        const newQuestion = new Question({
            title, description, difficulty, marks: marksNumber,
            questionType, options: safeOptions, correctAnswer,
            constraints, inputFormat, outputFormat,
            boilerplateCode,
            testcases: safeTestcases,
            type, // Save Type
            functionName, inputVariables: safeInputVariables
        });

        await newQuestion.save();
        res.status(200).json({ success: true, problemId: newQuestion._id });
    } catch (error) {
        next(error);
    }
};

// @desc Update an existing problem
const updateProblem = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;
        const {
            title, description, difficulty, marks,
            questionType, options, correctAnswer,
            constraints, inputFormat, outputFormat, testcases,
            type,
            functionName, inputVariables,
            boilerplate
        } = req.body;

        const isCoding = questionType === 'Coding' || type === 'coding';
        const isMcq = questionType === 'Single Correct' || questionType === 'Multiple Correct' || type === 'mcq';
        const marksNumber = marks !== undefined ? toNumber(marks) : null;

        if (marks !== undefined && marksNumber === null) {
            return res.status(400).json({ success: false, error: 'Invalid marks value' });
        }

        if (questionType !== undefined && !isCoding && !isMcq) {
            return res.status(400).json({ success: false, error: 'Invalid question type' });
        }

        const safeOptions = asArray(options);
        const safeInputVariables = asArray(inputVariables);
        const safeTestcases = asArray(testcases);

        if (isCoding && inputVariables !== undefined && !Array.isArray(inputVariables)) {
            return res.status(400).json({ success: false, error: 'Input variables must be an array' });
        }

        if (isCoding && (functionName !== undefined || inputVariables !== undefined)) {
            const signatureErrors = validateProblemConfig({ method: functionName, input: safeInputVariables });
            if (signatureErrors.length > 0) {
                return res.status(400).json({ success: false, error: signatureErrors.join('; ') });
            }
        }

        if (isMcq && options !== undefined && (!Array.isArray(options) || safeOptions.length < 2)) {
            return res.status(400).json({ success: false, error: 'Options must be an array with at least two values' });
        }

        let boilerplateCode = undefined;
        if (req.body.boilerplateCode || boilerplate) {
            boilerplateCode = { ...(req.body.boilerplateCode || boilerplate) };
        }

        // Generate Boilerplate if Coding type
        if ((questionType === 'Coding' || type === 'coding') && boilerplateCode) {
            const method = functionName;
            const inputs = safeInputVariables.map(v => ({
                variable: v.variable,
                type: v.type // Correct access
            }));

            const supportedLangs = ['c', 'cpp', 'java', 'python'];

            // Remove unsupported languages
            Object.keys(boilerplateCode).forEach(key => {
                if (!supportedLangs.includes(key)) {
                    delete boilerplateCode[key];
                }
            });

            // Failing here would leave the previous signature's stub on a question whose
            // driver has already changed, so surface it instead of keeping stale code.
            for (const lang of supportedLangs) {
                if (Object.prototype.hasOwnProperty.call(boilerplateCode, lang)) {
                    try {
                        boilerplateCode[lang] = getJudge(lang).generateBoilerplate({ method, input: inputs });
                    } catch (err) {
                        return res.status(400).json({ success: false, error: `Could not generate ${lang} boilerplate: ${err.message}` });
                    }
                }
            }
        }

        const updates = {
            title,
            description,
            difficulty,
            questionType,
            correctAnswer,
            constraints,
            inputFormat,
            outputFormat,
            boilerplateCode,
            type,
            functionName,
        };

        if (marks !== undefined) updates.marks = marksNumber;

        if (options !== undefined) updates.options = safeOptions;
        if (testcases !== undefined) updates.testcases = safeTestcases;
        if (inputVariables !== undefined) updates.inputVariables = safeInputVariables;

        const question = await Question.findByIdAndUpdate(id, updates, { returnDocument: "after" });

        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        invalidate(`question:${id}`);

        res.status(200).json({ success: true, problemId: question._id });
    } catch (error) {
        next(error);
    }
};

// @desc Get problem details
const getProblemDetail = async (req, res, next) => {
    try {
        await connectDB();
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        res.status(200).json({ success: true, problem: question });
    } catch (error) {
        next(error);
    }
};

// @desc Delete a problem
const deleteQuestion = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const usedBy = await Contest.find({ questions: id }).select('title startTime endTime status');
        const now = new Date();
        const live = usedBy.filter((contest) => {
            const status = (contest.status || '').toLowerCase();
            const manuallyEnded = status === 'completed' || status === 'ended';
            return !manuallyEnded && now >= new Date(contest.startTime) && now <= new Date(contest.endTime);
        });

        // Removing a problem mid-sitting shifts every candidate's question list and score.
        if (live.length > 0) {
            return res.status(409).json({
                success: false,
                error: `This question is in progress in: ${live.map((c) => c.title).join(', ')}. End those contests before deleting it.`
            });
        }

        const question = await Question.findByIdAndDelete(id);

        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        // Otherwise contests keep a dangling id and silently serve fewer problems.
        await Contest.updateMany({ questions: id }, { $pull: { questions: id } });

        res.status(200).json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// --- Contests ---

// Status is derived from the stored field OR the time window (see the summary
// mapping below), so filtering by it needs the equivalent Mongo predicate rather
// than a plain field match. `status` has no schema default, and $nin matches
// documents where the field is absent.
const ENDED_STATUSES = ['completed', 'ended'];
const statusQuery = (status, now) => ({
    completed: { $or: [{ status: { $in: ENDED_STATUSES } }, { status: { $nin: ENDED_STATUSES }, endTime: { $lt: now } }] },
    ongoing: { status: { $nin: ENDED_STATUSES }, startTime: { $lte: now }, endTime: { $gte: now } },
    waiting: { status: { $nin: ENDED_STATUSES }, startTime: { $gt: now } },
}[status]);

// @desc Get all contests for admin dashboard
const getAdminContests = async (req, res, next) => {
    try {
        await connectDB();
        const now = new Date();

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
        const skip = (page - 1) * limit;

        const filter = {};
        const statusFilter = statusQuery(req.query.status, now);
        if (statusFilter) Object.assign(filter, statusFilter);

        const term = (req.query.q || '').trim().slice(0, 100);
        if (term) {
            const rx = { $regex: escapeRegex(term), $options: 'i' };
            // $and, because a 'completed' status filter already occupies $or.
            filter.$and = [{ $or: [{ title: rx }, { description: rx }] }];
        }

        const { from, to } = req.query;
        if (from || to) {
            // Spread, so an ongoing/waiting filter's startTime bound survives.
            filter.startTime = {
                ...(filter.startTime || {}),
                ...(from && { $gte: new Date(from) }),
                ...(to && { $lte: new Date(`${to}T23:59:59.999Z`) }),
            };
        }

        // Return summary fields
        const [contests, total] = await Promise.all([
            Contest.find(filter)
                .select('title description createdAt questions author startTime endTime durationMinutes joinId status')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Contest.countDocuments(filter),
        ]);

        // One grouped query instead of one Submission.find() per contest.
        const submissionCounts = await Submission.aggregate([
            { $match: { contest: { $in: contests.map(c => c._id) } } },
            { $group: {
                _id: { contest: '$contest', status: '$status' },
                count: { $sum: 1 },
            } },
        ]);
        const countsByContest = {};
        submissionCounts.forEach(({ _id, count }) => {
            const key = _id.contest.toString();
            countsByContest[key] ??= { total: 0, completed: 0 };
            countsByContest[key].total += count;
            if (_id.status === 'Completed') countsByContest[key].completed += count;
        });

        const summary = contests.map(c => {
            const start = new Date(c.startTime);
            const end = new Date(c.endTime);

            const totalMinutes = c.durationMinutes || 0;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            let durationStr = "";
            if (hours > 0) durationStr += `${hours}h `;
            if (minutes > 0) durationStr += `${minutes}m `;
            if (!durationStr) durationStr = "0m";

            const { total = 0, completed = 0 } = countsByContest[c._id.toString()] || {};
            const ongoing = total - completed;

            // Compute Status Dynamically, unless manually ended/completed via the admin panel
            let computedStatus = 'waiting';
            const contestStatus = (c.status || '').toLowerCase();
            const isManuallyEnded = contestStatus === 'completed' || contestStatus === 'ended';

            if (isManuallyEnded) {
                computedStatus = 'completed';
            } else {
                if (now > end) {
                    computedStatus = 'completed';
                } else if (now >= start && now <= end) {
                    computedStatus = 'ongoing';
                }
            }

            return {
                id: c._id,
                title: c.title,
                description: c.description,
                createdAt: c.createdAt,
                status: computedStatus,
                participants: total,
                participantsCompleted: completed,
                participantsInProgress: ongoing,
                problemCount: c.questions ? c.questions.length : 0,
                startsAt: c.startTime,
                endsAt: c.endTime,
                duration: durationStr.trim(),
                joinId: c.joinId
            };
        });

        res.status(200).json({ success: true, contests: summary, total, page, limit });
    } catch (error) {
        next(error);
    }
};

// @desc Get detailed contest information
const getAdminContestDetail = async (req, res, next) => {
    try {
        await connectDB();
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        // Populate questions manually since they are strings, keeping the
        // contest's own ordering.
        const questions = await findQuestionsInOrder(contest.questions);

        const contestWithQuestions = contest.toObject();
        contestWithQuestions.questions = questions;

        res.status(200).json({ success: true, contest: contestWithQuestions });
    } catch (error) {
        next(error);
    }
};

// @desc Create a new contest
const createContest = async (req, res, next) => {
    try {
        await connectDB();
        const { title, description, duration, durationMinutes, problemIds, rules, author } = req.body;

        if (!isNonEmptyString(title)) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        if (!duration || !duration.start || !duration.end) {
            return res.status(400).json({ success: false, error: 'Duration with start and end is required' });
        }

        const durationMinutesNum = toNumber(durationMinutes);
        if (!durationMinutesNum || durationMinutesNum < 1) {
            return res.status(400).json({ success: false, error: 'durationMinutes is required and must be a positive number' });
        }

        if (problemIds !== undefined && !Array.isArray(problemIds)) {
            return res.status(400).json({ success: false, error: 'problemIds must be an array' });
        }

        // duration is { start, end } — the join window, not the per-user attempt length
        const startTime = new Date(duration.start);
        const endTime = new Date(duration.end);

        if (endTime <= startTime) {
            return res.status(400).json({ success: false, error: 'End time must be after start time' });
        }

        const now = new Date();
        const buffer = 5 * 60 * 1000; // 5 minute buffer
        if (startTime < new Date(now.getTime() - buffer)) {
            return res.status(400).json({ success: false, error: 'Start time cannot be in the past' });
        }

        // Generate unique 6-digit Join ID — rely on the unique index to detect collisions
        let newContest;
        for (let attempt = 0; attempt < 10; attempt++) {
            const joinId = Math.floor(100000 + Math.random() * 900000).toString();
            try {
                newContest = new Contest({
                    title, description, startTime, endTime,
                    durationMinutes: durationMinutesNum,
                    questions: problemIds,
                    rules,
                    joinId,
                    author: author || "Admin"
                });
                await newContest.save();
                break;
            } catch (err) {
                if (err.code === 11000) continue; // duplicate joinId — retry
                throw err;
            }
        }
        if (!newContest) throw new Error('Failed to generate a unique join ID after 10 attempts');
        res.status(200).json({ success: true, contestId: newContest._id });
    } catch (error) {
        next(error);
    }
};

// @desc Clone an existing contest
const cloneContest = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const originalContest = await Contest.findById(id);
        if (!originalContest) {
            return res.status(404).json({ success: false, error: 'Original contest not found' });
        }

        const now = new Date();
        const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
        const endTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);   // 48 hours from now

        // Generate unique 6-digit Join ID — rely on the unique index to detect collisions
        let newContest;
        for (let attempt = 0; attempt < 10; attempt++) {
            const joinId = Math.floor(100000 + Math.random() * 900000).toString();
            try {
                newContest = new Contest({
                    title: `Copy of ${originalContest.title}`,
                    description: originalContest.description,
                    startTime,
                    endTime,
                    durationMinutes: originalContest.durationMinutes,
                    questions: originalContest.questions,
                    rules: originalContest.rules,
                    joinId,
                    author: originalContest.author || "Admin"
                });
                await newContest.save();
                break;
            } catch (err) {
                if (err.code === 11000) continue; // duplicate joinId — retry
                throw err;
            }
        }
        if (!newContest) throw new Error('Failed to generate a unique join ID after 10 attempts');
        res.status(200).json({ success: true, contestId: newContest._id, joinId: newContest.joinId });
    } catch (error) {
        next(error);
    }
};

// @desc Update an existing contest
const updateContest = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { title, description, duration, durationMinutes, problemIds, rules, visibility } = req.body;

        const existingContest = await Contest.findById(id).select('startTime');
        if (!existingContest) return res.status(404).json({ success: false, error: 'Contest not found' });

        if (title !== undefined && !isNonEmptyString(title)) {
            return res.status(400).json({ success: false, error: 'Title cannot be empty' });
        }

        if (duration !== undefined && (!duration.start || !duration.end)) {
            return res.status(400).json({ success: false, error: 'Duration must include start and end' });
        }

        let durationMinutesNum;
        if (durationMinutes !== undefined) {
            durationMinutesNum = toNumber(durationMinutes);
            if (!durationMinutesNum || durationMinutesNum < 1) {
                return res.status(400).json({ success: false, error: 'durationMinutes must be a positive number' });
            }
        }

        if (problemIds !== undefined && !Array.isArray(problemIds)) {
            return res.status(400).json({ success: false, error: 'problemIds must be an array' });
        }

        const updates = { title, description, rules, visibility };
        if (durationMinutesNum !== undefined) {
            updates.durationMinutes = durationMinutesNum;
        }
        if (duration) {
            updates.startTime = new Date(duration.start);
            updates.endTime = new Date(duration.end);

            if (updates.endTime <= updates.startTime) {
                return res.status(400).json({ success: false, error: 'End time must be after start time' });
            }

            const now = new Date();
            if (updates.endTime <= now) {
                return res.status(400).json({ success: false, error: 'End time must be in the future' });
            }

            // Allow keeping/adjusting an already-past start time (editing a live/ongoing
            // test), but don't let it be backdated further than it already was.
            if (updates.startTime < existingContest.startTime && updates.startTime < now) {
                return res.status(400).json({ success: false, error: 'Start time cannot be moved further into the past' });
            }
        }
        if (problemIds) {
            updates.questions = problemIds;
        }

        const contest = await Contest.findByIdAndUpdate(id, updates, { returnDocument: "after" });
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        invalidate(`contest:${id}`);
        invalidate(`contest-questions:${id}`);

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @desc End a contest: blocks new joins/starts, lets in-progress candidates finish
const endContest = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const contest = await Contest.findByIdAndUpdate(id, { status: 'ended' }, { returnDocument: 'after' });
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        invalidate(`contest:${id}`);

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// @desc Force-end a contest: also immediately submits every in-progress candidate
const forceEndContest = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const contest = await Contest.findByIdAndUpdate(id, { status: 'ended' }, { returnDocument: 'after' });
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        invalidate(`contest:${id}`);

        const { modifiedCount } = await Submission.updateMany(
            { contest: id, status: 'Ongoing' },
            {
                $set: {
                    status: 'Completed',
                    submittedAt: new Date(),
                    forcedSubmission: true,
                    autoSubmitReason: 'CONTEST_FORCE_ENDED',
                },
            }
        );

        res.status(200).json({ success: true, submittedCount: modifiedCount });
    } catch (error) {
        next(error);
    }
};

// @desc Get contest results
const getAdminContestResults = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const skip = (page - 1) * limit;

        const contest = await Contest.findById(id).populate('questions', 'marks');
        if (!contest) {
            return res.status(404).json({ success: false, error: 'Contest not found' });
        }

        const match = { contest: contest._id, status: 'Completed' };

        // One round trip for the page of rows plus whole-set stats. The $project
        // drops each submission's embedded answers/testCaseResults, which is the
        // bulk of the document and is never rendered in the results table.
        const [facet] = await Submission.aggregate([
            { $match: match },
            {
                $facet: {
                    rows: [
                        // _id breaks ties, otherwise equal scores can repeat or skip across pages.
                        { $sort: { totalScore: -1, submittedAt: 1, _id: 1 } },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'user',
                                foreignField: '_id',
                                as: 'user',
                                pipeline: [{ $project: { name: 1, email: 1 } }],
                            },
                        },
                        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                        { $project: { user: 1, totalScore: 1, submittedAt: 1 } },
                    ],
                    meta: [{ $group: { _id: null, total: { $sum: 1 }, avg: { $avg: '$totalScore' } } }],
                },
            },
        ]);

        const { total = 0, avg = 0 } = facet?.meta?.[0] || {};
        const maxScore = (contest.questions || []).reduce((sum, q) => sum + (q.marks || 0), 0);

        res.status(200).json({
            success: true,
            contest: {
                _id: contest._id,
                title: contest.title,
                description: contest.description,
                startTime: contest.startTime,
                endTime: contest.endTime,
                maxScore,
            },
            results: facet?.rows || [],
            total,
            averageScore: avg || 0,
            page,
            limit,
        });
    } catch (error) {
        next(error);
    }
};

// @desc Delete a contest
const deleteContest = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const contest = await Contest.findById(id);
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        if (contest.status === 'ongoing') {
            return res.status(400).json({ success: false, error: 'Cannot delete an ongoing contest' });
        }

        // Double check time (in case cron/status is stale). A late joiner's
        // personal deadline can run past endTime, so guard up to the last
        // possible deadline, not just the join window's endTime.
        const now = new Date();
        const start = new Date(contest.startTime);
        const lastPossibleDeadline = new Date(new Date(contest.endTime).getTime() + (contest.durationMinutes || 0) * 60000);
        const isRunning = now >= start && now <= lastPossibleDeadline;

        if (isRunning) {
            return res.status(400).json({ success: false, error: 'Cannot delete a contest that is currently active (Time-based protection).' });
        }

        await Contest.findByIdAndDelete(id);
        
        // Delete all submissions associated with this contest
        await Submission.deleteMany({ contest: id });

        res.status(200).json({ success: true, message: 'Contest deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc Get admin dashboard statistics
const getAdminStats = async (req, res, next) => {
    try {
        await connectDB();
        const now = new Date();

        const [
            activeContests,
            totalQuestions,
            draftTests,
            totalParticipants,
            recentTestsData,
            questionBankData
        ] = await Promise.all([
            Contest.countDocuments({
                startTime: { $lte: now },
                $expr: { $gte: [{ $add: ["$endTime", { $multiply: [{ $ifNull: ["$durationMinutes", 0] }, 60000] }] }, now] }
            }),
            Question.countDocuments({}),
            Contest.countDocuments({ startTime: { $gt: now } }),
            Submission.countDocuments({}),
            Contest.find().sort({ createdAt: -1 }).limit(4).lean(),
            Question.aggregate([
                { $group: { _id: "$difficulty", count: { $sum: 1 } } }
            ])
        ]);

        const recentTests = await Promise.all(recentTestsData.map(async (contest) => {
            const submissions = await Submission.find({ contest: contest._id }).select('status');
            const total = submissions.length;
            const completed = submissions.filter(s => s.status === 'Completed').length;
            const inProgress = total - completed;

            return {
                ...contest,
                participants: total,
                participantsCompleted: completed,
                participantsInProgress: inProgress
            };
        }));

        // Process question bank data to match UI structure
        const difficultyMap = { Easy: 0, Medium: 0, Hard: 0 };
        let totalQBank = 0;
        questionBankData.forEach(item => {
            if (item._id && difficultyMap.hasOwnProperty(item._id)) {
                difficultyMap[item._id] = item.count;
                totalQBank += item.count;
            }
        });

        const questionBank = {
            easy: difficultyMap.Easy,
            medium: difficultyMap.Medium,
            hard: difficultyMap.Hard,
            total: totalQBank
        };

        return res.status(200).json({
            success: true,
            activeContests,
            totalQuestions,
            draftTests,
            totalParticipants,
            recentTests,
            questionBank
        });
    } catch (err) {
        return next(err);
    }
};

// @desc Export a single question or multiple questions as JSON
const exportQuestion = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { bulk } = req.query; // ?bulk=true to export multiple

        try {
            if (bulk === 'true') {
                // Export all questions
                const questions = await Question.find().lean();
                if (questions.length === 0) {
                    return res.status(404).json({ success: false, error: 'No questions found' });
                }

                const payload = exportBulkQuestions(questions);
                const jsonString = exportPayloadToJSON(payload, true);
                const filename = generateExportFilename(undefined, questions.length);

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.status(200).send(jsonString);
            } else {
                // Export single question
                const question = await Question.findById(id).lean();
                if (!question) {
                    return res.status(404).json({ success: false, error: 'Question not found' });
                }

                const exportedQuestion = exportSingleQuestion(question);
                const payload = exportBulkQuestions([question]); // Wrap in bulk format for consistency
                const jsonString = exportPayloadToJSON(payload, true);
                const filename = generateExportFilename(question.title, 1);

                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                return res.status(200).send(jsonString);
            }
        } catch (exportError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to export question',
                details: exportError.message
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc Import questions from JSON
const importQuestions = async (req, res, next) => {
    try {
        await connectDB();

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const fileContent = req.file.buffer.toString('utf-8');

        const result = processImportJSON(fileContent);

        if (!result.valid) {
            const errorMessages = result.errors
                .map(e => `${e.field ? `Field "${e.field}"` : ''}: ${e.message}`)
                .join('; ');
            return res.status(400).json({
                success: false,
                error: `JSON validation failed: ${errorMessages}`,
                errors: result.errors
            });
        }

        // Insert validated questions
        let imported = 0;
        if (result.queries && result.queries.length > 0) {
            const insertResult = await Question.insertMany(result.queries);
            imported = insertResult.length;
        }

        return res.status(200).json({
            success: true,
            imported,
            total: result.queries ? result.queries.length : 0,
            errors: result.errors.length > 0 ? result.errors : undefined,
        });
    } catch (error) {
        next(error);
    }
};

// @desc Get detailed submission data for a single student attempt
// NOTE: the route param is named :submissionId but the frontend actually passes a userId
const getAdminSubmissionDetail = async (req, res, next) => {
    try {
        await connectDB();
        const { contestId, submissionId: userId } = req.params;

        const submission = await Submission.findOne({
            user: userId,
            contest: contestId
        })
            .populate('user', 'name email')
            .populate('submissions.question', 'title marks questionType difficulty testcases')
            .lean();

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        res.status(200).json({ success: true, submission });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createProblem,
    updateProblem,
    getProblemDetail,
    getAdminContests,
    getAdminContestDetail,
    createContest,
    cloneContest,
    updateContest,
    endContest,
    forceEndContest,
    getAdminContestResults,
    deleteQuestion,
    deleteContest,
    getAdminStats,
    importQuestions,
    exportQuestion,
    getAdminSubmissionDetail,
    _statusQuery: statusQuery, // exported for tests/adminContests.test.js
};

