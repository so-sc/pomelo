const rateLimit = require('express-rate-limit');

const MINUTE = 60 * 1000;

// Per signed-in user (requireAuth must run first); falls back to IP to avoid runtime errors.
const userKey = (req, res) => req.user?.id || rateLimit.ipKeyGenerator(req.ip);

const limited = (error) => ({ success: false, error, rateLimited: true });

/**
 * Auth Limiter: 10 requests per minute per IP + email.
 * Keyed on the email too, so a campus behind one NAT isn't locked out by one user,
 * while guessing passwords for one account stays throttled.
 */
const authLimiter = rateLimit({
  windowMs: MINUTE,
  max: 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${rateLimit.ipKeyGenerator(req.ip)}:${email}`;
  },
  message: limited('Too many requests from this IP, please try again after a minute'),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Auth IP Limiter: 200 requests per minute per IP across all emails, so one address
 * can't spray passwords or mass-register. Generous because a whole campus can share
 * one NAT address at contest start.
 */
const authIpLimiter = rateLimit({
  windowMs: MINUTE,
  max: 200,
  keyGenerator: (req) => rateLimit.ipKeyGenerator(req.ip),
  message: limited('Too many requests from this network, please try again after a minute'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Submission Limiter: 10 requests per minute strictly per user ID.
 * Applied only to authenticated routes (requireAuth must be called first).
 */
const submissionLimiter = rateLimit({
  windowMs: MINUTE,
  max: 10,
  keyGenerator: userKey,
  message: limited('Too many submissions, please try again after a minute'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * MCQ Limiter: 30 requests per minute per user.
 * MCQ answers are lightweight — allow more frequent saves.
 */
const mcqLimiter = rateLimit({
  windowMs: MINUTE,
  max: 30,
  keyGenerator: userKey,
  message: limited('Too many answer saves, please slow down'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Keep feedback retries independent of the candidate's code-submission quota.
const feedbackLimiter = rateLimit({
  windowMs: MINUTE,
  max: 10,
  keyGenerator: userKey,
  message: limited('Too many feedback requests, please try again after a minute'),
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Join Limiter: 10 requests per minute per IP for anonymous contest joins.
 * Join IDs come from a 900k space, so this still makes guessing impractical.
 */
const joinLimiter = rateLimit({
  windowMs: MINUTE,
  max: 10,
  message: limited('Too many join attempts, please try again after a minute'),
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authIpLimiter,
  authLimiter,
  submissionLimiter,
  mcqLimiter,
  feedbackLimiter,
  joinLimiter,
};
