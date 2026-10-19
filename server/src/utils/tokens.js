'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/** Issue an access token for a user id. */
function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'valmoney',
  });
}

/** Verify an access token; throws on tampering or expiry. */
function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'valmoney' });
}

/** Random numeric one-time code (safe for emails, no ambiguous leading zeros). */
function generateOtp(digits = 6) {
  const max = 10 ** digits;
  return String(crypto.randomInt(0, max)).padStart(digits, '0');
}

/**
 * Codes and reset tokens are stored hashed, so a database leak does not hand
 * out account access. SHA-256 is appropriate here (unlike for passwords)
 * because the input is high-entropy or short-lived.
 */
function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/** Constant-time string comparison to avoid timing side channels. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateOtp,
  generateResetToken,
  hashValue,
  safeEqual,
};
