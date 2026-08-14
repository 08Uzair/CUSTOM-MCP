import { validateApi, normalizeBaseUrl, buildAuthHeaders } from './api-analyzer.js';
import { findOpenApiSpec, convertSpecToEndpoints } from './openapi-analyzer.js';

/**
 * Full discovery pipeline (POST /api/integrations/discover):
 *   validate URL -> check server -> check endpoint -> inspect response
 *   -> detect JSON -> search for OpenAPI/Swagger -> analyze endpoints
 */
export async function discoverApi(config, ctx = {}) {
  const { apiBaseUrl, auth } = config;
  const baseUrl = normalizeBaseUrl(apiBaseUrl);
  const checks = [];
  const result = {
    success: false,
    serverReachable: false,
    apiReachable: false,
    jsonDetected: false,
    openapiDetected: false,
    openapiUrl: null,
    endpoints: [],
    source: null,
    checks,
    latencyMs: null,
  };

  const validation = await validateApi(config, ctx);
  result.serverReachable = validation.serverReachable;
  result.apiReachable = validation.apiReachable;
  result.jsonDetected = validation.jsonDetected;
  result.latencyMs = validation.latencyMs;
  checks.push(...validation.checks);

  if (!validation.serverReachable) {
    result.message = 'Server is not reachable - fix the base URL and retry';
    return result;
  }

  // Authenticated discovery: auth values may be attached transiently by the
  // wizard and are used for the probe only (never stored).
  const authHeaders = buildAuthHeaders(auth);

  // 1. Try to find an OpenAPI description.
  const found = await findOpenApiSpec(baseUrl, authHeaders, ctx);
  if (found) {
    const endpoints = convertSpecToEndpoints(found.spec);
    if (endpoints.length > 0) {
      result.openapiDetected = true;
      result.openapiUrl = found.url;
      result.endpoints = endpoints;
      result.source = 'openapi';
      result.success = true;
      checks.push({
        label: 'OpenAPI detected',
        status: 'ok',
        message: `${endpoints.length} operation(s) found in ${found.url}`,
      });
    } else {
      checks.push({
        label: 'OpenAPI detected',
        status: 'warn',
        message: `Spec found at ${found.url} but no usable operations were extracted`,
      });
    }
  } else {
    checks.push({
      label: 'OpenAPI detected',
      status: 'warn',
      message: 'No OpenAPI/Swagger document found - manual endpoint configuration will be used',
    });
  }

  if (result.endpoints.length === 0) {
    // 2. Fall back to manual configuration using the API base + a root probe.
    const root = await probeRoot(baseUrl, authHeaders, ctx);
    if (root?.ok && root.jsonDetected) {
      result.endpoints = [{ method: 'GET', path: '/', summary: 'Root endpoint', source: 'manual' }];
      result.source = 'manual';
    } else if (!result.openapiDetected) {
      checks.push({
        label: 'Endpoint discovery',
        status: 'warn',
        message: 'No endpoints could be discovered automatically - add them manually',
      });
    }
  }

  if (result.endpoints.length > 0) {
    checks.push({
      label: 'Endpoint analysis',
      status: 'ok',
      message: `${result.endpoints.length} endpoint(s) ready for tool generation`,
    });
  }

  result.success = result.serverReachable && result.apiReachable;
  result.message = result.success
    ? `Discovery complete - ${result.endpoints.length} endpoint(s) from ${result.source || 'unknown'} source`
    : 'Discovery finished with warnings';
  return result;
}

async function probeRoot(baseUrl, authHeaders, ctx) {
  const target = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const { safeFetch } = await import('../utils/safe-fetch.js');
  return safeFetch(target, { method: 'GET', headers: authHeaders }, ctx);
}