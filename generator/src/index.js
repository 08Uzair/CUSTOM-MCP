/**
 * @aig/generator - public API surface.
 *
 * The backend imports ONLY this module; everything else stays internal.
 */
export { validateApi } from './analyzers/api-analyzer.js';
export { discoverApi } from './analyzers/discover.service.js';
export { analyzeEndpoints } from './analyzers/endpoint-analyzer.js';
export { buildToolRegistry } from './adapters/api-adapter.js';

import { buildProjectConfig } from './services/configuration.service.js';
export { buildProjectConfig, PORTS } from './services/configuration.service.js';
export { generateProject, cleanupArtifacts } from './services/generation.service.js';

/**
 * Builds the full project plan used by the Preview endpoint:
 * tool registry, ports, auth contract and env summary.
 */
export function buildPreview(config) {
  const projectConfig = buildProjectConfig(config);
  return {
    projectName: projectConfig.projectName,
    appUrl: projectConfig.appUrl,
    apiBaseUrl: projectConfig.apiBaseUrl,
    auth: {
      type: projectConfig.auth.type,
      env: projectConfig.auth.env,
    },
    ai: projectConfig.ai,
    ports: projectConfig.ports,
    tools: projectConfig.tools,
    mcp: projectConfig.mcp,
    security: {
      secretsPersisted: false,
      ssrfProtection: true,
      privateHostsBlocked: true,
    },
  };
}