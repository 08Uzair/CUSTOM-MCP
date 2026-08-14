import YAML from 'yaml';
import { safeFetch } from '../utils/safe-fetch.js';
import { normalizeBaseUrl } from './api-analyzer.js';

/**
 * Probes the API base for OpenAPI/Swagger definitions and converts the spec
 * into the generic endpoint list used by the endpoint analyzer.
 *
 * Candidate urls are probed in order of likelihood; the first JSON or YAML
 * document that parses and looks like an OpenAPI spec wins.
 */
const SPEC_CANDIDATES = [
  '/openapi.json',
  '/openapi.yaml',
  '/openapi.yml',
  '/swagger.json',
  '/swagger.yaml',
  '/swagger.yml',
  '/api/openapi.json',
  '/api/swagger.json',
  '/api-docs',
  '/v3/api-docs',
  '/v2/api-docs',
  '/api-docs/swagger.json',
  '/swagger/v1/swagger.json',
];

const SPEC_KEYS = ['openapi', 'swagger', 'paths', 'info'];

export async function findOpenApiSpec(baseUrl, authHeaders, ctx) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return null;

  for (const candidate of SPEC_CANDIDATES) {
    const url = new URL(candidate, base.endsWith('/') ? base : `${base}/`).toString();
    const response = await safeFetch(url, { method: 'GET', headers: authHeaders }, ctx);
    if (!response.ok) continue;

    const contentType = response.contentType || '';
    const looksJson = contentType.includes('json') || response.text.trimStart().startsWith('{');
    const looksYaml = contentType.includes('yaml') || /^(openapi|swagger)\s*:/i.test(response.text.trimStart());
    if (!looksJson && !looksYaml) continue;

    let parsed = null;
    try {
      parsed = looksYaml ? YAML.parse(response.text) : JSON.parse(response.text);
    } catch {
      continue;
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && SPEC_KEYS.some((k) => k in parsed)) {
      return { url, spec: parsed, sourceFormat: looksYaml ? 'yaml' : 'json', status: response.status };
    }
  }
  return null;
}

/**
 * Converts an OpenAPI document into normalized endpoint entries.
 * Returns [] when the document is not a usable OpenAPI spec.
 */
export function convertSpecToEndpoints(spec) {
  if (!spec || typeof spec !== 'object' || !spec.paths || typeof spec.paths !== 'object') return [];

  const endpoints = [];
  const isOpenApi3 = spec.openapi?.startsWith('3');

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      const normalized = method.toLowerCase();
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(normalized)) continue;

      const params = [];
      if (Array.isArray(operation?.parameters)) {
        for (const p of operation.parameters) {
          params.push({
            name: p.name,
            in: p.in,
            required: Boolean(p.required),
            type: inferType(p.schema) || (p.schema?.type ?? 'string'),
          });
        }
      }
      if (isOpenApi3) {
        // OpenAPI 3 path params are usually declared in parameters; if they
        // are missing, derive them from the path template as a fallback.
        for (const match of path.match(/\{([^}]+)\}/g) || []) {
          const name = match.slice(1, -1);
          if (!params.some((x) => x.name === name)) {
            params.push({ name, in: 'path', required: true, type: 'string' });
          }
        }
      } else {
        // Swagger 2: parameters live on the operation + path item level.
        const rawParams = [...(pathItem.parameters || []), ...(operation.parameters || [])];
        params.length = 0;
        for (const p of rawParams) {
          params.push({
            name: p.name,
            in: p.in,
            required: Boolean(p.required),
            type: p.type || inferType(p.schema) || 'string',
          });
        }
      }

      const bodySchema = isOpenApi3
        ? operation?.requestBody?.content?.['application/json']?.schema || null
        : operation?.parameters?.find((p) => p.in === 'body')?.schema || null;

      endpoints.push({
        method: normalized.toUpperCase(),
        path,
        summary: operation?.summary || `${normalized.toUpperCase()} ${path}`,
        params,
        body: bodySchema ? simplifySchema(bodySchema) : null,
        source: 'openapi',
      });
    }
  }
  return endpoints;
}

function inferType(schema) {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.type) return schema.type;
  if (schema.$ref) return 'string';
  if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) return 'string';
  return null;
}

/** Flattens a JSON Schema object into a shallow property map for tool schemas. */
function simplifySchema(schema) {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.$ref) {
    return { ref: schema.$ref };
  }
  const result = { type: schema.type || 'object', properties: {}, required: schema.required || [] };
  if (schema.properties && typeof schema.properties === 'object') {
    for (const [name, prop] of Object.entries(schema.properties)) {
      result.properties[name] = {
        type: inferType(prop) || 'string',
        ...(prop.description ? { description: prop.description } : {}),
      };
    }
  }
  return result;
}