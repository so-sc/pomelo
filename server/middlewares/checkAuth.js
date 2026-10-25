const requireAuth = () => async (req, res, next) => {
  try {
    const { jwtVerify } = await import('jose');

    const authHeader = req.headers.authorization;
    if (!process.env.AUTH_SECRET) {
      console.error('AUTH_SECRET is not configured');
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    try {
      const { payload } = await jwtVerify(token, secret);
      
      // Transform payload to match expected user structure
      req.user = {
        id: payload.userId,
        role: payload.role,
        email: payload.email
      };
      next();
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = { requireAuth };
