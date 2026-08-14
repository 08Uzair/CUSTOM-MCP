import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';
import env from '../config/env.js';

const standardResponse = (message) => ({
  success: false,
  error: { code: 'RATE_LIMITED', message },
});

function limiter({ limit, label }) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(ApiError.tooManyRequests('RATE_LIMITED', `${label} rate limit exceeded. Try again shortly.`)),
    ...standardResponse,
  });
}

/** Default limit for all /api routes. */
export const apiLimiter = limiter({ limit: env.RATE_LIMIT_MAX, label: 'API' });

/** Stricter limit for expensive endpoints (validate / discover / generate). */
export const strictLimiter = limiter({ limit: env.RATE_LIMIT_STRICT_MAX, label: 'Heavy operation' });