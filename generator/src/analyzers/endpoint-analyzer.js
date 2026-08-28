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

function buildInputSchema(method, path, params, body, payload) {
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

  const wantsBody = ['POST', 'PUT', 'PATCH'].includes(method) && !(payload && payload.hasBody === false);
  if (wantsBody) {
    const payloadBody = buildBodySchema(payload);
    properties.body = {
      type: 'object',
      description: `Request body for ${method} ${path}`,
      properties: payloadBody?.properties || body?.properties || {},
      required: payloadBody?.required || body?.required || [],
    };
    required.push('body');
  }

  return { type: 'object', properties, required };
}

/**
 * Maps the user-defined payload (fields/example JSON) onto the body schema
 * the AI must fill: field names, types and required flags become part of the
 * tool contract, so validation and the LLM agree on the same payload.
 *
 * Field names may be dot-paths (paymentInfo.id) - they are rebuilt into a
 * properly NESTED JSON schema so the generated zod schema and the payload
 * guide match the real request body shape.
 */
function buildBodySchema(payload) {
  if (!payload || payload.hasBody === false) return null;

  const fields = payload.fields || [];
  const root = { properties: {}, required: [] };
  let usedFields = 0;

  for (const field of fields) {
    if (!field?.name) continue;
    const segments = String(field.name).split('.').filter(Boolean);
    if (!segments.length) continue;
    usedFields += 1;

    // Walk/create the container chain (paymentInfo.id -> { paymentInfo: { id } }).
    let node = root;
    for (const segment of segments.slice(0, -1)) {
      node = ensureContainer(node, segment);
    }

    const leaf = segments[segments.length - 1];
    const prop = { type: field.type || 'string' };
    if (field.description) prop.description = field.description;
    node.properties[leaf] = prop;
    if (field.required && !node.required.includes(leaf)) node.required.push(leaf);
  }

  // No explicit fields? Derive the schema recursively from the example JSON
  // so the AI still has the concrete (nested) shape to fill in.
  if (usedFields === 0 && payload.example && typeof payload.example === 'object' && !Array.isArray(payload.example)) {
    for (const [name, value] of Object.entries(payload.example)) {
      root.properties[name] = schemaFromExample(value);
    }
  }

  return root;
}

/** One example JSON value -> nested JSON schema property. */
function schemaFromExample(value) {
  if (Array.isArray(value)) {
    const sample = value[0];
    if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
      return { type: 'array', items: schemaFromExample(sample), description: 'Field from the example payload' };
    }
    return { type: 'array', description: 'Field from the example payload' };
  }
  if (value && typeof value === 'object') {
    const properties = {};
    for (const [name, child] of Object.entries(value)) {
      properties[name] = schemaFromExample(child);
    }
    return { type: 'object', properties, required: [], description: 'Field from the example payload' };
  }
  return { type: inferJsonType(value), description: 'Field from the example payload' };
}

/**
 * Returns (creating if needed) the container a child path segment descends
 * into. Object parents become nested `properties`; array-of-object parents
 * keep their `array` type and nest children under `items`.
 */
function ensureContainer(parent, segment) {
  if (!parent.properties[segment]) {
    parent.properties[segment] = { type: 'object', properties: {}, required: [] };
    return parent.properties[segment];
  }
  const existing = parent.properties[segment];
  if (existing.type === 'array') {
    if (!existing.items || existing.items.type !== 'object' || !existing.items.properties) {
      existing.items = { type: 'object', properties: {}, required: [] };
    }
    return existing.items;
  }
  // A parent declared as a leaf must become a container for its children.
  if (existing.type !== 'object' || !existing.properties) {
    Object.assign(existing, { type: 'object', properties: {}, required: [] });
  }
  return existing;
}

/**
 * Compact human-readable payload format for one tool, e.g.
 *   { title: string (required), paymentInfo: { id: string, totalPrice: string } }
 * or a JSON example when no fields were defined. Used by the AI server's
 * system prompt so the model sends exactly the (nested) payload the API expects.
 */
export function buildPayloadGuide(method, payload) {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return null;
  if (!payload || payload.hasBody === false) return null;

  const schema = buildBodySchema(payload);
  if (schema && Object.keys(schema.properties).length) {
    return `{ ${formatGuideShape(schema)} }`;
  }
  if (payload.example && typeof payload.example === 'object' && Object.keys(payload.example).length) {
    return JSON.stringify(payload.example);
  }
  return null;
}

/** Nested, human-readable shape: { user: string, paymentInfo: { id: string (required) } }. */
function formatGuideShape(schema) {
  const parts = [];
  for (const [name, prop] of Object.entries(schema.properties || {})) {
    const mark = (schema.required || []).includes(name) ? ' (required)' : '';
    if (prop.type === 'object' && prop.properties && Object.keys(prop.properties).length) {
      parts.push(`${name}: { ${formatGuideShape(prop)} }${mark}`);
    } else if (prop.type === 'array' && prop.items?.properties && Object.keys(prop.items.properties).length) {
      parts.push(`${name}: array<{ ${formatGuideShape(prop.items)} }>${mark}`);
    } else {
      parts.push(`${name}: ${prop.type}${mark}`);
    }
  }
  return parts.join(', ');
}

function inferJsonType(value) {
  if (value === null) return 'string';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

function buildRequest(method, path, params, payload) {
  const queryParams = (params || [])
    .filter((p) => p.in === 'query')
    .map((p) => ({ name: p.name, required: Boolean(p.required), type: p.type || 'string' }));
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method) && !(payload && payload.hasBody === false);
  return { method, path, pathParams: null, queryParams, body: hasBody };
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
    const payloadGuide = buildPayloadGuide(endpoint.method, endpoint.payload);

    tools.push({
      name: unique,
      description: buildDescription(endpoint.method, endpoint.path, endpoint.summary) +
        (payloadGuide ? ` Payload format: ${payloadGuide}.` : ''),
      inputSchema: buildInputSchema(endpoint.method, endpoint.path, endpoint.params, endpoint.body, endpoint.payload),
      request: buildRequest(endpoint.method, endpoint.path, endpoint.params, endpoint.payload),
      payloadGuide,
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