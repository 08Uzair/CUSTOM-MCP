export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Unified API client. Unwraps the backend envelope
 * ({ success, data, message } | { success, error: { code, message } }) and
 * always throws ApiError with a readable message on failure.
 */
export async function apiFetch(path, { method = 'GET', body, params, timeoutMs } = {}) {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs) : null;

  try {
    const response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload?.success) {
      const message = payload?.error?.message || `Request failed (HTTP ${response.status})`;
      const code = payload?.error?.code || 'REQUEST_FAILED';
      throw new ApiError(code, message, payload?.error?.details);
    }
    return payload.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') throw new ApiError('TIMEOUT', 'Request timed out - is the backend running?');
    throw new ApiError('NETWORK_ERROR', `Cannot reach the API at ${API_URL}. Start the backend with: npm run dev:backend`);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Streams a file download from an API endpoint (returns the blob url). */
export async function downloadFile(path, fileName) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    let message = `Download failed (HTTP ${response.status})`;
    try {
      const body = await response.json();
      message = body?.error?.message || message;
    } catch {
      /* keep default */
    }
    throw new ApiError('DOWNLOAD_FAILED', message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export { ApiError };