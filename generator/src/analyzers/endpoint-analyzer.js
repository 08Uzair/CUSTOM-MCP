/**
 * Turns discovered endpoints into the final MCP tool plan.
 *
 * Naming: GET /users        -> get_users
 *         GET /users/:id    -> get_user
 *         POST /users       -> create_user
 *         PUT /users/:id    -> update_user
 *         DELETE /users/:id -> delete_user
 *
 * The result of this module is a pure data registry - the generated MCP
 * server consumes it through ONE generic executor, so tools can never
 * degrade into an unrestricted HTTP proxy.
 */

const METHOD_VERBS = {
  GET: 'get',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

const singularize = (segment) => (segment.endsWith('s') ? segment.slice(0, -1) : segment);

/**
 * Tool naming per spec:
 *   GET /users        -> get_users
 *   GET /users/:id    -> get_user
 *   POST /users       -> create_user
 *   PUT /users/:id    -> update_user
 *   DELETE /users/:id -> delete_user
 *   GET /users/:id/posts -> get_user_posts
 */
function buildToolName(method, path) {
  const rawSegments = path.split('/').filter(Boolean);
  const segments = rawSegments.map((s) => {
    const cleaned = s.replace(/[{}:]/g, '');
    return cleaned === '' ? 'param' : cleaned.replace(/[^a-zA-Z0-9_]+/g, '_');
  });

  const idIndex = rawSegments.findIndex((s) => s.startsWith(':') || s.startsWith('{'));

  let parts;
  if (idIndex !== -1) {
    // Drop the id segment; singularize the resource it belongs to.
    parts = segments.slice(0, idIndex - 1);
    const resource = segments[idIndex - 1];
    const tail = segments.slice(idIndex + 1);
    if (resource) parts.push(singularize(resource));
    parts.push(...tail);
  } else if (method === 'GET') {
    // Collection listing keeps the plural noun: get_users.
    parts = segments;
  } else {
    // Other verbs address one resource: create_user.
    parts = [...segments.slice(0, -1), singularize(segments[segments.length - 1])];
  }

  parts = parts.filter(Boolean);
  return `${METHOD_VERBS[method] || 'call'}_${parts.join('_') || 'endpoint'}`;
}

function buildDescription(method, path, summary) {
  const verbs = { GET: 'Retrieves', POST: 'Creates', PUT: 'Updates', PATCH: 'Updates', DELETE: 'Deletes' };
  const verb = verbs[method];
  const hasId = path.includes(':') || path.includes('{');

  const raw = path.split('/').filter(Boolean);
  const last = raw[raw.length - 1] || '';
  const noun = hasId ? singularize(last.replace(/[{}:]/g, '')) : last.replace(/[{}:]/g, '');
  const article = ['GET', 'DELETE'].includes(method) ? '' : 'a ';
  const subject = hasId ? `${article}${noun}` : noun;

  const custom = summary && summary !== `${method} ${path}` ? ` (${summary})` : '';
  return `${verb} ${subject} from the target API via ${method} ${path}${custom}.`;
}

function buildInputSchema(method, path, params, body) {
  const properties = {};
  const required = [];

  for (const param of params || []) {
    if (param.in === 'path' || param.name.startsWith(':')) {
      const name = param.name.replace(/^:/, '');
      properties[name] = {
        type: 'string',
        description: `Value for the :${name} path parameter`,
      };
      required.push(name);
    } else if (param.in === 'query') {
      const ptype = param.type || 'string';
      properties[param.name] = {
        type: ptype,
        description: param.description || `Query parameter ${param.name}`,
      };
      if (param.required) required.push(param.name);
    }
  }

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
  if (hasBody) {
    properties.body = {
      type: 'object',
      description: `Request body for ${method} ${path}`,
      properties: body?.properties || {},
      required: body?.required || [],
    };
    required.push('body');
  }

  return { type: 'object', properties, required };
}

function buildRequest(method, path, params) {
  const queryParams = (params || [])
    .filter((p) => p.in === 'query')
    .map((p) => ({ name: p.name, required: Boolean(p.required), type: p.type || 'string' }));
  return { method, path, pathParams: null, queryParams, body: ['POST', 'PUT', 'PATCH'].includes(method) };
}

/**
 * @param endpoints [{method, path, summary?, params?, body?}]
 * @returns { tools: [...] } - the MCP tool registry for this integration.
 */
export function analyzeEndpoints(endpoints = []) {
  const seen = new Set();
  const tools = [];

  for (const endpoint of endpoints) {
    if (!endpoint?.method || !endpoint?.path) continue;

    const name = buildToolName(endpoint.method, endpoint.path);
    const unique = dedupeName(name, seen);

    tools.push({
      name: unique,
      description: buildDescription(endpoint.method, endpoint.path, endpoint.summary),
      inputSchema: buildInputSchema(endpoint.method, endpoint.path, endpoint.params, endpoint.body),
      request: buildRequest(endpoint.method, endpoint.path, endpoint.params),
    });
  }

  return { tools };
}

function dedupeName(name, seen) {
  let candidate = name;
  let i = 2;
  while (seen.has(candidate)) {
    candidate = `${name}_${i}`;
    i += 1;
  }
  seen.add(candidate);
  return candidate;
}