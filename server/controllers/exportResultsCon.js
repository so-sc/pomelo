const Contest = require('../models/Contest');
const Submission = require('../models/Submissions');
const { connectDB } = require('../helpers/dbCon');
const { buildScoreCSV, buildSubmissionsDump, generateResultsFilename } = require('../utils/resultsIO/export');

async function loadContestAndSubmissions(id) {
    const contest = await Contest.findById(id)
        .select('title questions._id questions.title questions.marks questions.questionType')
        .lean();
    if (!contest) {
        return { contest: null, submissions: [] };
    }

    const submissions = await Submission.find({ contest: id, status: 'Completed' })
        .populate('user', 'name email')
        .lean();

    // Resolve against the test's own copies, so a bank edit can't retitle or
    // re-mark a past export.
    const byId = new Map((contest.questions || []).map((q) => [String(q._id), q]));
    submissions.forEach((sub) => {
        (sub.submissions || []).forEach((item) => {
            item.question = byId.get(String(item.question));
        });
    });

    return { contest, submissions };
}

// @desc Export a contest's candidate scores as a CSV score sheet
const exportScores = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;

        const { contest, submissions } = await loadContestAndSubmissions(id);
        if (!contest) {
            return res.status(404).json({ success: false, error: 'Contest not found' });
        }

        try {
            const csv = buildScoreCSV(contest, submissions);
            const filename = `${generateResultsFilename(contest.title, 'scores')}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send(csv);
        } catch (exportError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to export scores',
                details: exportError.message
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc Export a contest's full submission data as a JSON dump (compact or verbose)
const exportSubmissions = async (req, res, next) => {
    try {
        await connectDB();
        const { id } = req.params;
        const verbose = req.query.verbose === 'true';

        const { contest, submissions } = await loadContestAndSubmissions(id);
        if (!contest) {
            return res.status(404).json({ success: false, error: 'Contest not found' });
        }

        try {
            const payload = buildSubmissionsDump(contest, submissions, { verbose });
            const jsonString = JSON.stringify(payload, null, 2);
            const filename = `${generateResultsFilename(contest.title, `submissions-${verbose ? 'verbose' : 'compact'}`)}.json`;

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send(jsonString);
        } catch (exportError) {
            return res.status(500).json({
                success: false,
                error: 'Failed to export submissions',
                details: exportError.message
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    exportScores,
    exportSubmissions,
};
