import { assertUrlAllowed } from './ssrf-guard.js';

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 2;

/**
 * SSRF-guarded fetch used by every analyzer. Never throws: returns a
 * normalized result so callers can always inspect what happened.
 */
export async function safeFetch(rawUrl, options = {}, ctx = {}) {
  const timeoutMs = ctx.timeoutMs || options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const allowlist = ctx.allowedPrivateHosts || [];

  const started = process.hrtime.bigint();

  const allowed = await assertUrlAllowed(rawUrl, allowlist);
  if (!allowed.allowed) {
    return {
      ok: false,
      error: { code: 'SSRF_BLOCKED', message: allowed.reason },
      latencyMs: elapsedMs(started),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

  let url = rawUrl;
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      // Manual redirect handling: every hop re-passes the SSRF guard.
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body,
        redirect: 'manual',
        signal: controller.signal,
      });

      if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get('location')) {
        url = new URL(response.headers.get('location'), url).toString();
        if (redirects === MAX_REDIRECTS) {
          return { ok: false, error: { code: 'TOO_MANY_REDIRECTS', message: 'Too many redirects' }, latencyMs: elapsedMs(started) };
        }
        const hop = await assertUrlAllowed(url, allowlist);
        if (!hop.allowed) {
          return { ok: false, error: { code: 'SSRF_BLOCKED', message: `Redirect target blocked: ${hop.reason}` }, latencyMs: elapsedMs(started) };
        }
        continue;
      }

      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      const text = await response.text();
      let data = null;
      let jsonDetected = false;

      if (contentType.includes('json') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
        try {
          data = JSON.parse(text);
          jsonDetected = true;
        } catch {
          data = null;
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        contentType,
        data,
        text: text.slice(0, 200_000),
        jsonDetected,
        finalUrl: url,
        latencyMs: elapsedMs(started),
      };
    }
  } catch (err) {
    const aborted = err?.name === 'AbortError' || /timed out/i.test(err?.message || '');
    return {
      ok: false,
      error: {
        code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: aborted ? `Request timed out after ${timeoutMs}ms` : err.message,
      },
      latencyMs: elapsedMs(started),
    };
  } finally {
    clearTimeout(timer);
  }

  return { ok: false, error: { code: 'UNKNOWN', message: 'Request failed' }, latencyMs: elapsedMs(started) };
}

function elapsedMs(started) {
  return Number(process.hrtime.bigint() - started) / 1e6;
}