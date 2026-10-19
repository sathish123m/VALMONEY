'use strict';

const { HttpError } = require('../lib/http-error');

/**
 * Validate `req[source]` against a Zod schema and replace it with the parsed
 * (and coerced) result, so controllers only ever see clean data.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(
        HttpError.unprocessable(
          'Validation failed.',
          result.error.issues.map((issue) => ({
            field: issue.path.join('.') || '(root)',
            message: issue.message,
          })),
        ),
      );
    }

    // req.query is a getter-only property in Express 5 and readonly-ish in 4,
    // so define it deliberately rather than assigning.
    if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
    } else {
      req[source] = result.data;
    }

    return next();
  };
}

module.exports = { validate };
