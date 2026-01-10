const Contest = require('../models/Contest');
const User = require('../models/User');

// @desc    Start a contest
// @route   POST /api/contests/:id/start
// @access  Private (requires authentication)
const startContest = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);

        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        // Check if the user is authorized to start the contest (e.g., admin or creator)
        // For now, we'll assume any authenticated user can start for demonstration

        contest.status = 'ongoing';
        contest.startTime = new Date();
        await contest.save();

        res.json({ message: 'Contest started successfully', contest });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Manage violations in a contest
// @route   POST /api/contests/:id/violation
// @access  Private (requires authentication)
const manageViolations = async (req, res) => {
    try {
        const { userId, details } = req.body;
        const contest = await Contest.findById(req.params.id);

        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add violation logic here
        // For example, adding to a violations array in the contest model
        const violation = {
            user: userId,
            timestamp: new Date(),
            details: details || ' details provided.'
        };

        // Assuming contest schema has a 'violations' array
        if (!contest.violations) {
            contest.violations = [];
        }
        contest.violations.push(violation);

        await contest.save();

        res.json({ message: 'Violation recorded successfully', violation });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Check if test ID is valid
const checkTestId = async (req, res) => {
    try {
        const { contestId } = req.body;
        
        // Validate contestId
        if (!contestId || contestId.trim() === '') {
            return res.json({ isValid: false, error: 'Contest ID is required' });
        }
        
        const contest = await Contest.findById(contestId);

        if (!contest) {
            return res.json({ isValid: false });
        }

        return res.json({
            isValid: true,
            contestInfo: {
                title: contest.title,
                description: contest.description
            }
        });
    } catch (error) {
        return res.json({ isValid: false, error: error.message });
    }
};

// @desc    Get contest landing details
const getContestLanding = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        return res.json({
            success: true,
            data: {
                title: contest.title,
                description: contest.description,
                duration: {
                    start: contest.startTime,
                    end: contest.endTime
                },
                totalProblems: contest.questions.length,
                author: contest.author || "SCEM Coding Club",
                rules: contest.rules || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get contest data for attempt
const getContestData = async (req, res) => {
    try {
        const contestId = req.query.contestId;
        
        // Validate contestId
        if (!contestId || contestId.trim() === '') {
            return res.status(400).json({ success: false, error: 'Contest ID is required' });
        }
        
        const contest = await Contest.findById(contestId);
        if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

        // Fetch actual questions from Question model since schema now stores Strings
        // Assuming contest.questions is array of ID strings
        const questions = contest.questions && contest.questions.length > 0 
            ? await require('../models/Question').find({
                _id: { $in: contest.questions }
            })
            : [];

        const timeRemaining = Math.max(0, (contest.endTime - new Date()) / 1000);

        return res.json({
            success: true,
            data: {
                contestId: contest._id,
                title: contest.title,
                timeRemaining,
                problems: questions.map(q => ({
                    id: q._id,
                    title: q.title,
                    difficulty: q.difficulty,
                    description: q.description,
                    inputFormat: q.inputFormat,
                    outputFormat: q.outputFormat,
                    constraints: q.constraints,
                    boilerplate: q.boilerplateCode, // Map new schema field
                    questionType: q.questionType,
                    options: q.options,
                    points: q.marks
                }))
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Submit solution
const submitSolution = async (req, res) => {
    try {
        // TODO: Integrate with Submissions model
        return res.json({
            success: true,
            submissionId: "submission-id-placeholder"
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    End contest
const endContest = async (req, res) => {
    return res.json({
        success: true,
        redirectUrl: `/leaderboard`
    });
};

// @desc    Start test (User Attempt)
const startTest = async (req, res) => {
    try {
        const { contestId, userId } = req.body;
        // Verify user and contest?
        // Logic to create a session or 'attempt' record would go here

        return res.json({
            success: true,
            sessionToken: "session-token-placeholder" // In real app, generate JWT or DB session ID
        });
    } catch (error) {
        return res.json({ success: false, error: error.message });
    }
};

// @desc    Get questions for a specific test
// @route   GET /api/test/:id/questions
// @access  Public
const getTestQuestions = async (req, res) => {
    try {
        const { id: testId } = req.params;

        // Validate test ID format
        if (!testId || (typeof testId === 'string' && testId.trim() === '')) {
            return res.status(400).json({
                success: false,
                error: 'Invalid test ID provided'
            });
        }

        // Fetch the contest/test
        const contest = await Contest.findById(testId);

        // Check if test exists
        if (!contest) {
            return res.status(404).json({
                success: false,
                error: 'Test not found'
            });
        }

        // Check if test is active (ongoing or waiting - not completed)
        if (contest.status === 'completed') {
            return res.status(403).json({
                success: false,
                error: 'This test has been completed and questions are no longer available'
            });
        }

        // Check if test is public or within the time window
        const now = new Date();
        const testStarted = now >= contest.startTime;
        const testEnded = now > contest.endTime;

        if (testEnded) {
            return res.status(403).json({
                success: false,
                error: 'This test has ended'
            });
        }

        // Fetch questions from the database
        const Question = require('../models/Question');
        // Handle empty questions array
        const questions = contest.questions && contest.questions.length > 0 
            ? await Question.find({
                _id: { $in: contest.questions }
            })
            : [];

        // Return questions with metadata
        const questionsWithMetadata = questions.map((q, index) => {
            // Extract sample test case (first one only) for security
            let sampleTestCase = null;
            if (q.testcases && q.testcases.length > 0) {
                sampleTestCase = {
                    input: q.testcases[0].input,
                    output: q.testcases[0].output
                };
            }

            return {
                id: q._id,
                number: index + 1,
                title: q.title,
                description: q.description,
                difficulty: q.difficulty,
                marks: q.marks,
                type: q.type,
                questionType: q.questionType,
                constraints: q.constraints,
                inputFormat: q.inputFormat,
                outputFormat: q.outputFormat,
                boilerplateCode: q.boilerplateCode,
                functionName: q.functionName,
                inputVariables: q.inputVariables,
                // Include sample test cases (first test case if available)
                sampleTestCase: sampleTestCase,
                totalTestCases: q.testcases ? q.testcases.length : 0,
                // For MCQ questions
                options: q.options || [],
                // Time status
                timeRemaining: Math.max(0, (contest.endTime - now) / 1000)
            };
        });

        return res.json({
            success: true,
            data: {
                testId: contest._id,
                testTitle: contest.title,
                testDescription: contest.description,
                testStatus: contest.status,
                testStartTime: contest.startTime,
                testEndTime: contest.endTime,
                testStarted,
                totalQuestions: questionsWithMetadata.length,
                timeRemaining: Math.max(0, (contest.endTime - now) / 1000),
                questions: questionsWithMetadata
            }
        });
    } catch (error) {
        console.error('Error fetching test questions:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

module.exports = {
    startContest,
    manageViolations,
    checkTestId,
    getContestLanding,
    getContestData,
    submitSolution,
    endContest,
    startTest,
    getTestQuestions
};
