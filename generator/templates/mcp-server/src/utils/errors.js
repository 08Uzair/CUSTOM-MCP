import { z } from 'zod';
import { env } from '../config/env.js';

/** Repository of shared validation / coercion helpers. */
export const inputUtils = { z };

/**
 * Normalizes target-API errors so they can be surfaced through MCP without
 * leaking internal details to the caller.
 */
export class TargetApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'TargetApiError';
    this.status = status || 500;
    this.code = code || 'TARGET_API_ERROR';
    this.details = details;
  }
}

export function toMcpError(error) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: false,
            error: {
              code: error?.name === 'TargetApiError' ? error.code : 'TOOL_EXECUTION_ERROR',
              message: error?.message || 'Unknown tool error',
              ...(error?.details ? { details: error.details } : {}),
            },
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}