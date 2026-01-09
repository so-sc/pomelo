const Contest = require('../models/Contest');

/**
 * @desc    Action 1: Validate 6-digit Join ID (OTP)
 * @route   POST /api/test-access/validate
 */
const validateJoinId = async (req, res) => {
    try {
        const { joinId } = req.body;

        // Search the database for the 6-digit joinCode
        const contest = await Contest.findOne({ joinId: joinId });

        if (!contest) {
            return res.status(404).json({ 
                success: false, 
                message: "Invalid Join ID. No test found with this code." 
            });
        }

        // Return the MongoDB _id so the frontend can redirect to the landing page
        return res.status(200).json({
            success: true,
            contestId: contest._id,
            title: contest.title
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Action 2: Get Instructions/Landing Metadata
 * @route   GET /api/test-access/:id/landing
 */
const getLandingDetails = async (req, res) => {
    try {
        // req.contest is pre-populated by isContestActive middleware
        const contest = req.contest || await Contest.findById(req.params.id);

        if (!contest) {
            return res.status(404).json({ success: false, message: "Test details not found" });
        }

        const now = new Date();
        const start = new Date(contest.startTime);

        // Server-side timing logic for the "Start" button
        const canStart = now >= start;

        res.status(200).json({
            success: true,
            data: {
                title: contest.title,
                description: contest.description,
                rules: contest.rules,
                duration: contest.duration,
                startTime: contest.startTime,
                serverTime: now,
                canStart: canStart 
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { validateJoinId, getLandingDetails };