import * as generator from '@aig/generator';
import env, { allowedPrivateHosts } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const networkOptions = () => ({
  allowedPrivateHosts,
  timeoutMs: env.REQUEST_TIMEOUT_MS,
});

export async function runValidation(config) {
  const result = await generator.validateApi(config, networkOptions());
  if (!result.success) {
    throw ApiError.badRequest('VALIDATION_FAILED', result.message, result.checks);
  }
  return result;
}

export async function runDiscovery(config) {
  const result = await generator.discoverApi(config, networkOptions());
  if (!result.success) {
    throw ApiError.badRequest('DISCOVERY_FAILED', result.message, result.checks);
  }
  return result;
}

/** Builds the full plan shown on the Preview step (tools, ports, env summary). */
export async function runPreview(config) {
  return generator.buildPreview(config);
}

export async function cleanupOldArtifacts() {
  return generator.cleanupArtifacts({ ttlHours: env.ARTIFACT_TTL_HOURS });
}