import cors from 'cors';
import { corsOrigins } from './env.js';

/**
 * CORS configuration. Only origins listed in CORS_ORIGINS are allowed to
 * call the API from a browser. Requests without an Origin header (curl,
 * server-to-server) are permitted.
 */
export function corsMiddleware() {
  return cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86_400,
  });
}