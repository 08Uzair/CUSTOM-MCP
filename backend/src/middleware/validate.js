import { ApiError } from '../utils/ApiError.js';

/**
 * Validates req.body against a Zod schema before a handler runs.
 * `source` allows validating other parts of the request (params, query).
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('VALIDATION_ERROR', 'Invalid request payload', details));
    }
    req[source] = result.data;
    return next();
  };
}