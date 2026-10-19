'use strict';

const rateLimit = require('express-rate-limit');

const jsonHandler = (message) => (req, res) => res.status(429).json({ error: message });

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Tests must not be throttled.
  skip: () => process.env.NODE_ENV === 'test',
};

/** Brute-force protection for credential endpoints. */
const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  handler: jsonHandler('Too many attempts. Please wait a few minutes and try again.'),
});

/** Email-sending endpoints are expensive, so they get a stricter budget. */
const mailLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: jsonHandler('Too many emails requested. Please try again later.'),
});

/** Broad safety net for the rest of the API. */
const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  handler: jsonHandler('Too many requests. Please slow down.'),
});

module.exports = { authLimiter, mailLimiter, apiLimiter };
