/**
 * Wraps an async route handler so rejected promises are forwarded to the
 * central error handler instead of crashing the process.
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}