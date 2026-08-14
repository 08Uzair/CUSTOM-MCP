import { safeFetch } from '../utils/safe-fetch.js';

/**
 * Validation pipeline used by POST /api/integrations/validate:
 *   validate URL -> check server -> check endpoint -> inspect response -> detect JSON
 * Returns a non-throwing, human-readable result suitable for both the API
 * and the wizard's "Test Connection" flow.
 */
export async function validateApi(config, ctx = {}) {
  const { apiBaseUrl, endpoint, method, auth = { type: 'none' } } = config;
  const checks = [];
  const result = {
    success: false,
    serverReachable: false,
    apiReachable: false,
    jsonDetected: false,
    endpointDetected: false,
    checks,
    latencyMs: null,
    serverInfo: null,
  };

  const baseUrl = normalizeBaseUrl(apiBaseUrl);
  if (!baseUrl) {
    checks.push({ label: 'URL validation', status: 'fail', message: `${apiBaseUrl} is not a valid http(s) URL` });
    result.message = 'Invalid URL';
    return result;
  }

  // Auth values may be sent TRANSIENTLY for the probe only - they are never
  // persisted and never appear in generated output.
  const authHeaders = buildAuthHeaders(auth);

  // 1. Server reachability - HEAD on the base to keep it light; fall back to GET.
  // Any HTTP response (even 404/500) proves the server is up; the endpoint
  // probe below decides whether the API path actually works.
  const serverProbe = await safeFetch(baseUrl, { method: 'HEAD', headers: authHeaders }, ctx);
  const server = serverProbe.ok
    ? serverProbe
    : await safeFetch(baseUrl, { method: 'GET', headers: authHeaders }, ctx);

  if (server.status) {
    result.serverReachable = true;
    checks.push({
      label: 'Server reachable',
      status: server.ok ? 'ok' : 'warn',
      message: `${server.status} in ~${Math.round(server.latencyMs)}ms`,
    });
    result.serverInfo = { status: server.status, contentType: server.contentType };
  } else {
    checks.push({
      label: 'Server reachable',
      status: 'fail',
      message: server.error?.message || `HTTP ${server.status}`,
    });
    result.message = `Server at ${baseUrl} is not reachable`;
    return result;
  }

  // 2. Endpoint check.
  const testPath = endpoint || '/';
  const target = new URL(testPath, baseUrl).toString();
  const probe = await safeFetch(target, { method: method || 'GET', headers: authHeaders }, ctx);

  if (probe.ok || probe.status === 400 || probe.status === 401 || probe.status === 403 || probe.status === 404) {
    result.apiReachable = true;
    checks.push({
      label: 'API reachable',
      status: 'ok',
      message: `${method || 'GET'} ${testPath} -> ${probe.status}`,
    });
  } else {
    checks.push({
      label: 'API reachable',
      status: 'fail',
      message: probe.error?.message || `HTTP ${probe.status}`,
    });
    result.message = `Endpoint ${testPath} did not respond as expected`;
    return result;
  }

  // 3. JSON detection.
  if (probe.jsonDetected) {
    result.jsonDetected = true;
    checks.push({ label: 'JSON detected', status: 'ok', message: 'Response body is valid JSON' });
  } else {
    checks.push({ label: 'JSON detected', status: 'warn', message: 'Response did not parse as JSON' });
  }
  if (probe.status === 200 || probe.status === 201) {
    result.endpointDetected = true;
  }

  result.success = result.serverReachable && result.apiReachable;
  result.latencyMs = Math.round(probe.latencyMs);
  result.message = result.success ? 'Application and API responded successfully' : 'API responded, but with warnings';
  return result;
}

/** Trims trailing slashes but keeps the protocol so relative paths join correctly. */
export function normalizeBaseUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Transiently builds probe headers from auth config. Values are used for the
 * current request only and are discarded immediately afterwards.
 */
export function buildAuthHeaders(auth = {}) {
  const type = auth?.type || 'none';
  switch (type) {
    case 'bearer':
      if (auth.token) return { Authorization: `Bearer ${auth.token}` };
      return {};
    case 'api-key':
      if (auth.token) return { [auth.apiKeyHeader || 'x-api-key']: auth.token };
      return {};
    case 'custom-header':
      if (auth.headerName && auth.headerValue) return { [auth.headerName]: auth.headerValue };
      return {};
    case 'basic': {
      const user = auth.username || '';
      const pass = auth.basicPassword || '';
      if (user || pass) {
        return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
      }
      return {};
    }
    default:
      return {};
  }
}