const User = require('../models/User');

// Authorises on the database role, not the token's: a token keeps the role it was minted
// with for days, which would leave a demoted admin or deleted account with access.
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No user data' });
    }

    const userId = req.user.id;
    const user = await User.findById(userId).select('role');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Account no longer exists' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access only' });
    }

    req.user.role = user.role;
    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = isAdmin;
