const User = require('../models/User');

const syncUser = async (req, res, next) => {
  try {
    // req.auth is provided by the Clerk middleware
    const clerkId = req.auth.userId;

    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1. Check if user already exists in our Mongo
    let user = await User.findOne({ clerkId });

    // 2. If not, create them on the fly
    if (!user) {
      console.log(`Syncing new user: ${clerkId}`);
      user = await User.create({
        clerkId,
        // Since we don't have the email from the token easily here,
        // we use a placeholder or wait for a webhook/frontend update
        email: "", 
        name: "New Student",
        role: "user",
        registeredContests: []
      });
    }

    // 3. Attach user to the request so controllers can use it
    req.user = user;
    next();
  } catch (error) {
    console.error("User Sync Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { syncUser };