const Question = require('../models/Question');
const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const { connectDB } = require('../helpers/dbCon');
const { getJudge } = require("@pomelo/code-gen");

// --- Questions ---

// @desc Create a new problem
const createProblem = async (req, res) => {
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

        // Map frontend 'boilerplate' to model 'boilerplateCode'
        let boilerplateCode = req.body.boilerplateCode || boilerplate;

        // Generate Boilerplate if Coding type
        if ((questionType === 'Coding' || type === 'coding') && boilerplateCode) {
            const method = functionName;
            const inputs = inputVariables.map(v => ({
                variable: v.variable,
                type: v.type // Correct access: flat structure
            }));

            // Iterate selected languages
            const supportedLangs = ['c', 'java', 'python'];

            // Remove unsupported languages from the object to prevent saving them
            Object.keys(boilerplateCode).forEach(key => {
                if (!supportedLangs.includes(key)) {
                    delete boilerplateCode[key];
                }
            });

            supportedLangs.forEach(lang => {
                // Only generate if the user selected this language (sent as key in boilerplateCode)
                if (Object.prototype.hasOwnProperty.call(boilerplateCode, lang)) {
                    try {
                        const judge = getJudge(lang);
                        const code = judge.generateBoilerplate({
                            method,
                            input: inputs
                        });
                        boilerplateCode[lang] = code;
                    } catch (err) {
                        console.error(`ERROR generating boilerplate for ${lang}:`, err);
                        console.warn(`Skipping boilerplate for ${lang}: ${err.message}`);
                        // Clear the placeholder if generation fails
                        if (boilerplateCode[lang] === "// auto-generated") {
                            boilerplateCode[lang] = "";
                        }
                    }
                }
            });
        }

        const newQuestion = new Question({
            title, description, difficulty, marks,
            questionType, options, correctAnswer,
            constraints, inputFormat, outputFormat,
            boilerplateCode,
            testcases,
            type, // Save Type
            functionName, inputVariables
        });

        await newQuestion.save();
        res.status(200).json({ success: true, problemId: newQuestion._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Update an existing problem
const updateProblem = async (req, res) => {
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

        let boilerplateCode = undefined;
        if (req.body.boilerplateCode || boilerplate) {
            boilerplateCode = { ...(req.body.boilerplateCode || boilerplate) };
        }

        // Generate Boilerplate if Coding type
        if ((questionType === 'Coding' || type === 'coding') && boilerplateCode) {
            const method = functionName;
            const inputs = inputVariables ? inputVariables.map(v => ({
                variable: v.variable,
                type: v.type // Correct access
            })) : [];

            const supportedLangs = ['c', 'java', 'python'];

            // Remove unsupported languages
            Object.keys(boilerplateCode).forEach(key => {
                if (!supportedLangs.includes(key)) {
                    delete boilerplateCode[key];
                }
            });

            supportedLangs.forEach(lang => {
                if (Object.prototype.hasOwnProperty.call(boilerplateCode, lang)) {
                    try {
                        const judge = getJudge(lang);
                        const code = judge.generateBoilerplate({
                            method,
                            input: inputs
                        });
                        boilerplateCode[lang] = code;
                    } catch (err) {
                        console.warn(`Skipping boilerplate for ${lang}: ${err.message}`);
                    }
                }
            });
        }

        const updates = {
            title, description, difficulty, marks,
            questionType, options, correctAnswer,
            constraints, inputFormat, outputFormat,
            boilerplateCode,
            testcases,
            type,
            functionName,
            inputVariables
        };

        const question = await Question.findByIdAndUpdate(id, updates, { new: true });

        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        res.status(200).json({ success: true, problemId: question._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get problem details
const getProblemDetail = async (req, res) => {
    try {
        await connectDB();
        const question = await Question.findById(req.params.id);
        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        res.status(200).json({ success: true, problem: question });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Delete a problem
const deleteQuestion = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const question = await Question.findByIdAndDelete(id);

        if (!question) return res.status(404).json({ success: false, error: 'Question not found' });

        res.status(200).json({ success: true, message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- Contests ---

// @desc Get all contests for admin dashboard
const getAdminContests = async (req, res) => {
    try {
        await connectDB();
        // Return summary fields
        const contests = await Contest.find().select('title description createdAt questions author startTime endTime joinId');
        const now = new Date();

        const summary = await Promise.all(contests.map(async c => {
            const start = new Date(c.startTime);
            const end = new Date(c.endTime);
            const durationMs = end - start;

            const seconds = Math.floor((durationMs / 1000) % 60);
            const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
            const hours = Math.floor((durationMs / (1000 * 60 * 60)));

            let durationStr = "";
            if (hours > 0) durationStr += `${hours}h `;
            if (minutes > 0) durationStr += `${minutes}m `;
            if (seconds > 0) durationStr += `${seconds}s`;
            if (!durationStr) durationStr = "0s";

            // Count submissions for this contest
            const contestSubmissions = await Submission.find({ contest: c._id }).select('status');
            const total = contestSubmissions.length;
            const completed = contestSubmissions.filter(s => s.status === 'Completed').length;
            const ongoing = total - completed;

            // Compute Status Dynamically (Pure Time-Based)
            let computedStatus = 'waiting';
            // Only override if it's not manually ended/completed
            const isManuallyEnded = false; // Status field removed, relying on time only

            if (!isManuallyEnded) {
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
                duration: durationStr.trim(),
                joinId: c.joinId
            };
        })); // Note: mapped to Promise.all now

        res.status(200).json({ success: true, contests: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get detailed contest information
const getAdminContestDetail = async (req, res) => {
    try {
        await connectDB();
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        // Populate questions manually since they are strings
        const questions = await Question.find({ _id: { $in: contest.questions } });

        const contestWithQuestions = contest.toObject();
        contestWithQuestions.questions = questions;

        res.status(200).json({ success: true, contest: contestWithQuestions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Create a new contest
const createContest = async (req, res) => {
    try {
        await connectDB();
        const { title, description, duration, problemIds, rules, type, visibility, author, status } = req.body;

        // duration is { start, end }
        const startTime = new Date(duration.start);
        const endTime = new Date(duration.end);


        // Generate Unique 6-digit Join ID
        let joinId;
        let isUnique = false;
        while (!isUnique) {
            joinId = Math.floor(100000 + Math.random() * 900000).toString();
            const existing = await Contest.findOne({ joinId });
            if (!existing) isUnique = true;
        }

        const newContest = new Contest({
            title, description, startTime, endTime,
            questions: problemIds, // Now just [String], matches schema
            rules, // Now [String], matches schema
            type, visibility,
            joinId, // Save generated ID
            author: author || "Admin" // Required field
        });

        await newContest.save();
        res.status(200).json({ success: true, contestId: newContest._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Update an existing contest
const updateContest = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { title, description, duration, problemIds, rules, visibility } = req.body;

        const updates = { title, description, rules, visibility };
        if (duration) {
            updates.startTime = new Date(duration.start);
            updates.endTime = new Date(duration.end);
        }
        if (problemIds) {
            updates.questions = problemIds;
        }

        const contest = await Contest.findByIdAndUpdate(id, updates, { new: true });
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get contest results
const getAdminContestResults = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        // Step 1 & 2: Fetch contest by ID
        const contest = await Contest.findById(id);
        if (!contest) {
            return res.status(404).json({ success: false, error: 'Contest not found' });
        }

        // Step 3: Check if contest has started
        const now = new Date();
        if (now < new Date(contest.startTime)) {
            return res.status(403).json({ success: false, error: 'Contest has not started yet' });
        }

        // Step 4: Query submissions with population
        const submissions = await Submission.find({ contest: id })
            .populate('user', 'name email')
            .populate('submissions.question', 'title marks questionType difficulty')
            .sort({ totalScore: -1 }) // Step 5: Sort by score descending (leaderboard)
            .lean();

        // Step 6: Return response
        res.status(200).json({ 
            success: true,
            contest: {
                _id: contest._id,
                title: contest.title,
                startTime: contest.startTime,
                endTime: contest.endTime
            },
            results: submissions // Empty array if no submissions
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Delete a contest
const deleteContest = async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;

        const contest = await Contest.findById(id);
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        if (contest.status === 'ongoing') {
            return res.status(400).json({ success: false, error: 'Cannot delete an ongoing contest' });
        }

        // Double check time (in case cron/status is stale)
        const now = new Date();
        const start = new Date(contest.startTime);
        const end = new Date(contest.endTime);
        const isRunning = now >= start && now <= end;

        if (isRunning) {
            return res.status(400).json({ success: false, error: 'Cannot delete a contest that is currently active (Time-based protection).' });
        }

        await Contest.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Contest deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get admin dashboard statistics
const getAdminStats = async (req, res) => {
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
            Contest.countDocuments({ startTime: { $lte: now }, endTime: { $gte: now } }),
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
        console.log(err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createProblem,
    updateProblem,
    getProblemDetail,
    getAdminContests,
    getAdminContestDetail,
    createContest,
    updateContest,
    getAdminContestResults,
    deleteQuestion,
    deleteContest,
    getAdminStats
};
