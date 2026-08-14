import { env, MCP } from '../config/env.js';
import { TOOLS } from '../config/tools.js';

/**
 * MCP resources - static, read-only data the AI server can consult.
 * Exposes an overview of the connected API + each tool.
 */
export function buildApiInfoResource() {
  return {
    uri: 'api://info',
    name: 'API Information',
    description: 'Overview of the {{PROJECT_NAME}} API connected to this MCP server',
    mimeType: 'application/json',
    content: {
      apiBaseUrl: env.TARGET_API_BASE_URL,
      authType: env.TARGET_API_AUTH_TYPE,
      toolCount: TOOLS.length,
      mcpServer: `${MCP.name}@${MCP.version}`,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description, method: t.request.method, path: t.request.path })),
    },
  };
}