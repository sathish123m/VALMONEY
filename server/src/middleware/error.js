'use strict';

const { ZodError } = require('zod');
const { Prisma } = require('@prisma/client');
const { HttpError } = require('../lib/http-error');
const { env } = require('../config/env');

/** 404 for unmatched routes. */
function notFoundHandler(req, _res, next) {
  next(HttpError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/** Turn anything thrown (or passed to next) into a predictable JSON error. */
function errorHandler(error, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong on our end.';
  let details;

  if (error instanceof HttpError) {
    status = error.status;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    status = 422;
    message = 'Validation failed.';
    details = error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'value';
      message = `That ${target} is already in use.`;
    } else if (error.code === 'P2025') {
      status = 404;
      message = 'Resource not found.';
    } else if (error.code === 'P2003') {
      status = 400;
      message = 'Related record does not exist.';
    } else {
      status = 400;
      message = 'Database request rejected.';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    message = 'Malformed database request.';
  } else if (error?.name === 'TokenExpiredError' || error?.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid authentication token.';
  } else if (error?.type === 'entity.too.large') {
    status = 413;
    message = 'Payload too large.';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
    ...(env.isProduction || status < 500 ? {} : { stack: error?.stack }),
  });
}

module.exports = { errorHandler, notFoundHandler };
