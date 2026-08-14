/**
 * Application error with a machine readable `code` and an HTTP `status`.
 * Every error eventually leaves the API through errorHandler as:
 *   { success: false, error: { code, message } }
 */
export class ApiError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(code, message) {
    return new ApiError(401, code, message);
  }

  static notFound(code, message) {
    return new ApiError(404, code, message);
  }

  static tooManyRequests(code, message) {
    return new ApiError(429, code, message);
  }

  static conflict(code, message) {
    return new ApiError(409, code, message);
  }

  static internal(code = 'INTERNAL_ERROR', message = 'An unexpected error occurred') {
    return new ApiError(500, code, message);
  }
}