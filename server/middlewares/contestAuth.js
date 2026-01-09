const Contest = require('../models/Contest');
const User = require('../models/User');



const protect = async (req, res, next) => {
  try {
    const clerkId = req.auth.userId; // Provided by Clerk middleware

    if (!clerkId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Try to find the user in your DB
    let user = await User.findOne({ clerkId });

    // 2. If the user doesn't exist, create a profile for them immediately
    if (!user) {
      console.log("User not found in DB, creating profile for:", clerkId);
      user = await User.create({
        clerkId: clerkId,
        name: "Student", // You can update this later with webhooks
        email: "",       // You can update this later
        role: "user",
        registeredContests: []
      });
    }

    
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * 2. PERMISSION CHECK (isContestActive)
 * Validates timing, registration, and violation limits.
 */
const isContestActive = async (req, res, next) => {
    try {
        const contestId = req.params.id || req.body.contestId;
        const clerkId = req.clerkId; // Set by the protect middleware above

        if (!contestId) {
            return res.status(400).json({ success: false, message: 'Contest ID is required' });
        }

        // Fetch data from MongoDB
        const [contest, user] = await Promise.all([
            Contest.findById(contestId),
            User.findOne({ clerkId })
        ]);

        if (!contest) return res.status(404).json({ success: false, message: 'Contest not found' });
        /*if (!user) return res.status(404).json({ success: false, message: 'User profile not found' });*/

        const now = new Date();
        const end = new Date(contest.endTime);

        // Logic Check A: Contest already finished?
        if (now > end) {
            return res.status(403).json({ success: false, message: 'This contest has already ended.' });
        }

        // Logic Check B: Anti-Cheating (Violation Limit)
        if (contest.violations?.length > 0) {
            const userViolations = contest.violations.filter(
                v => v.user.toString() === user._id.toString()
            );
            if (userViolations.length >= 3) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied: Maximum violations exceeded.' 
                });
            }
        }

        // Logic Check C: Private Access Check
        if (contest.visibility === 'public' && !user.registeredContests?.includes(contestId)) {
            return res.status(403).json({ 
                success: false, 
                message: 'This is a private contest. Registration required.' 
            });
        }

        // Pass the fetched data to the next function to save a DB query
        req.contest = contest;
        req.user = user;
        
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Security check failed', error: error.message });
    }
};

module.exports = { protect, isContestActive };