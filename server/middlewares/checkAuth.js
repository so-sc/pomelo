require('dotenv').config();

const requireAuth = () => async (req, res, next) => {
  try {
    const { jwtVerify } = await import('jose');

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    try {
      const { payload } = await jwtVerify(token, secret);
      req.user = payload;
      req.auth = { userId: payload.userId };
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Placeholder for options - can be extended for optional authentication
const options = {};

module.exports = { requireAuth, options };
