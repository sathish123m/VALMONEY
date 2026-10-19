'use strict';

const { HttpError } = require('../lib/http-error');
const { verifyAccessToken } = require('../utils/tokens');

/**
 * Rejects unauthenticated requests.
 *
 * Accepts the modern `Authorization: Bearer <token>` header and the legacy
 * `auth-token` header that the first version of the client sends, so existing
 * sessions keep working after the upgrade.
 */
function requireAuth(req, _res, next) {
  const header = req.header('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
  const token = bearer || req.header('auth-token');

  if (!token) {
    return next(HttpError.unauthorized('Authentication required.'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.token = token;
    return next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'Invalid authentication token.';
    return next(HttpError.unauthorized(message));
  }
}

module.exports = { requireAuth };
