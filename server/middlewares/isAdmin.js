const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: No user data' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

    next();
  } catch (error) {
    console.error('isAdmin Middleware Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

module.exports = isAdmin;
