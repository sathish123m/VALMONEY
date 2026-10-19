'use strict';

/**
 * Typed HTTP error used across controllers. The central error handler turns
 * these into JSON responses; anything else becomes a 500.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new HttpError(401, message);
  }

  static forbidden(message = 'Not allowed') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new HttpError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new HttpError(409, message);
  }

  static unprocessable(message = 'Validation failed', details) {
    return new HttpError(422, message, details);
  }
}

module.exports = { HttpError };
