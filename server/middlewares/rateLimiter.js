const rateLimit = require('express-rate-limit');

/**
 * Auth Limiter: 5 requests per minute per IP.
 * Applied to login and register routes.
 */
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Submission Limiter: 10 requests per minute strictly per user ID.
 * Applied only to authenticated routes (requireAuth must be called first).
 */
const submissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req, res) => {
    // Use user id when available; fall back to IP to avoid runtime errors
    return req.user?.id || req.user?._id || req.user?.sub || rateLimit.ipKeyGenerator(req, res);
  },
  message: { success: false, error: 'Too many submissions, please try again after a minute', rateLimited: true },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * MCQ Limiter: 30 requests per minute per user.
 * MCQ answers are lightweight — allow more frequent saves.
 */
const mcqLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  keyGenerator: (req, res) => {
    return req.user?.id || req.user?._id || req.user?.sub || rateLimit.ipKeyGenerator(req, res);
  },
  message: { success: false, error: 'Too many answer saves, please slow down', rateLimited: true },
  standardHeaders: true,
  legacyHeaders: false,
});

// Keep feedback retries independent of the candidate's code-submission quota.
const feedbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || rateLimit.ipKeyGenerator(req.ip),
  message: { success: false, error: 'Too many feedback requests, please try again after a minute', rateLimited: true },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Join Limiter: Stricter limit for anonymous contest joins (2 requests per minute per IP).
 */
const joinLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 2,
  message: 'Too many join attempts, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  submissionLimiter,
  mcqLimiter,
  feedbackLimiter,
  joinLimiter,
};
