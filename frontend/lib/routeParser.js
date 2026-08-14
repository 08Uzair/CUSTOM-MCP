/** Express-style calls: router.get('/path', ...) | @app.post('/path') | server.put(...) */
const CALL_RE = /\b(?:router|route|app|server|api)\.(get|post|put|patch|delete|options|head)\s*\(\s*[`'"](\/?(?:[^`'"]*))[`'"]/gi;

/** Plain lines: "GET /users" | "post /orders" */
const PLAIN_RE = /^\s*(get|post|put|patch|delete|options|head)\s+(\/?.+?)\s*$/gim;

/**
 * Extracts endpoints from a route/controller file or pasted text.
 * Supports:
 *   - Express-style: router.get('/products', ...)
 *   - Decorators:    @router.get('/products')
 *   - Plain lines:   GET /products
 *   - Bare paths:    /products
 */
export function parseRouteFile(content = '') {
  if (typeof content !== 'string' || !content.trim()) return [];

  const seen = new Set();
  const endpoints = [];

  const add = (method, rawPath) => {
    if (!rawPath || typeof rawPath !== 'string') return;
    let path = rawPath.trim().replace(/[,;]$/, '').trim();
    if (!path || path.startsWith('//')) return;
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return;
    const q = path.indexOf('?');
    if (q !== -1) path = path.slice(0, q);
    if (!path || path.includes(' ')) return;
    if (!path.startsWith('/')) path = `/${path}`;

    const key = `${method.toUpperCase()} ${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    endpoints.push({ method: method.toUpperCase(), path, summary: '', source: 'manual' });
  };

  for (const m of content.matchAll(CALL_RE)) add(m[1], m[2]);
  for (const m of content.matchAll(PLAIN_RE)) add(m[1], m[2]);

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line.startsWith('/')) continue;
    add('GET', line);
  }

  return endpoints;
}
