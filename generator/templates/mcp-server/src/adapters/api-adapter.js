import { env } from '../config/env.js';
import { TargetApiError } from '../utils/errors.js';

/**
 * API Adapter - the ONLY place that talks to the target application.
 *
 * Responsibilities:
 *   - resolve the full URL (base + path + query parameters)
 *   - attach authentication headers from environment variables
 *   - send the request with a timeout
 *   - parse and normalize the response
 *
 * Configuration comes exclusively from environment variables set in .env.
 */
export async function executeTargetRequest(request, args) {
  const url = buildUrl(request, args);
  const headers = buildHeaders(request, args);
  const body = request.body && args.body ? JSON.stringify(args.body) : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Target API timed out after ${env.TARGET_API_TIMEOUT_MS}ms`)), env.TARGET_API_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      signal: controller.signal,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new TargetApiError(
        response.status,
        'TARGET_HTTP_ERROR',
        `Target API returned HTTP ${response.status} ${response.statusText || ''}`.trim(),
        { url, status: response.status, body: data }
      );
    }

    return {
      success: true,
      data,
      meta: {
        status: response.status,
        latencyMs: Date.now() - startedAt,
        url,
      },
    };
  } catch (err) {
    if (err instanceof TargetApiError) throw err;
    if (err?.name === 'AbortError' || /timed out/i.test(err?.message || '')) {
      throw new TargetApiError(504, 'TARGET_API_TIMEOUT', err.message);
    }
    throw new TargetApiError(502, 'TARGET_API_UNREACHABLE', `Failed to reach target API: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** TARGET_API_BASE_URL + path + query params from validated arguments. */
function buildUrl(request, args) {
  let pathTemplate = request.path || '/';
  // Substitute :param placeholders with validated argument values.
  for (const [key, value] of Object.entries(args || {})) {
    pathTemplate = pathTemplate
      .replace(new RegExp(`:${key}(?=/|$)`, 'g'), encodeURIComponent(String(value)))
      .replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(String(value)));
  }
  const pathWithParams = pathTemplate.replace(/\/:[^/]+/g, (match) => {
    const name = match.slice(2);
    const value = args?.[name];
    if (value === undefined) return match;
    return `/${encodeURIComponent(String(value))}`;
  });

  const url = new URL(pathWithParams || '/', ensureTrailingSlash(env.TARGET_API_BASE_URL));

  for (const qp of request.queryParams || []) {
    const value = args?.[qp.name];
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(qp.name, String(value));
    }
  }
  return url.toString();
}

function ensureTrailingSlash(base) {
  return base.endsWith('/') ? base : `${base}/`;
}

/** Authentication headers resolved from environment variables only. */
function buildHeaders() {
  const headers = { Accept: 'application/json' };
  if (env.TARGET_API_BASIC_USERNAME || env.TARGET_API_BASIC_PASSWORD) {
    // Basic auth loses its meaning over plain HTTP - degrade loudly.
    headers.Authorization = `Basic ${Buffer.from(`${env.TARGET_API_BASIC_USERNAME}:${env.TARGET_API_BASIC_PASSWORD}`).toString('base64')}`;
  }
  switch ((env.TARGET_API_AUTH_TYPE || 'none').toLowerCase()) {
    case 'bearer':
      if (env.TARGET_API_TOKEN) headers.Authorization = `Bearer ${env.TARGET_API_TOKEN}`;
      break;
    case 'api-key':
      if (env.TARGET_API_API_KEY) headers[env.TARGET_API_API_KEY_HEADER || 'x-api-key'] = env.TARGET_API_API_KEY;
      break;
    case 'custom-header':
      if (env.TARGET_API_AUTH_HEADER_NAME && env.TARGET_API_AUTH_HEADER_VALUE) {
        headers[env.TARGET_API_AUTH_HEADER_NAME] = env.TARGET_API_AUTH_HEADER_VALUE;
      }
      break;
    case 'basic':
      // handled above
      break;
    default:
      break;
  }
  return headers;
}