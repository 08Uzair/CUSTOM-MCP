import { buildToolRegistry } from '../adapters/api-adapter.js';

/**
 * Fixed Groq model - every generated project uses this model id.
 * (Keep in sync with generator/templates/ai-server/src/providers/groq.provider.js)
 */
export const FIXED_GROQ_MODEL = 'openai/gpt-oss-120b';

export const PORTS = {
  aiServer: 4000,
  mcpServer: 5000,
};

/**
 * Turns one Integration configuration into the concrete "plan" used to
 * render templates, write .env.example files and build documentation.
 * This is the single source of truth for the generated project.
 */
export function buildProjectConfig(config) {
  const { name, appUrl, apiBaseUrl, auth = {}, ai = {}, endpoints = [] } = config;

  const tools = config.tools?.length ? config.tools : buildToolRegistry(endpoints);
  const projectName = name || 'my-ai-integration';
  const safeName = slugify(projectName);

  // The model is FIXED for all generated projects - not user-configurable.
  const aiModel = FIXED_GROQ_MODEL;

  const authEnv = authEnvFor(auth);

  return {
    projectName,
    projectSlug: safeName,
    version: '1.0.0',
    appUrl: appUrl || '',
    apiBaseUrl,
    auth: {
      type: auth.type || 'none',
      headerName: auth.headerName || '',
      apiKeyHeader: auth.apiKeyHeader || 'x-api-key',
      username: auth.username || '',
      env: authEnv,
    },
    ai: {
      provider: ai.provider || 'groq',
      model: aiModel,
    },
    tools,
    ports: { ...PORTS },
    mcp: {
      // The MCP server endpoint the AI server talks to.
      serverUrl: process.env.MCP_SERVER_URL || `http://localhost:${PORTS.mcpServer}/mcp`,
    },
  };
}

/**
 * Environment-variable contract for the generated mcp-server.
 * Values stay empty - real secrets are filled in by the developer when they
 * create their .env from .env.example.
 */
function authEnvFor(auth) {
  switch (auth.type) {
    case 'bearer':
      return {
        lines: ['TARGET_API_AUTH_TYPE=bearer', 'TARGET_API_TOKEN='],
        hints: ['TARGET_API_TOKEN - your bearer token (e.g. `tok_...` or a JWT)'],
      };
    case 'api-key':
      return {
        lines: ['TARGET_API_AUTH_TYPE=api-key', `TARGET_API_API_KEY_HEADER=${auth.apiKeyHeader || 'x-api-key'}`, 'TARGET_API_API_KEY='],
        hints: ['TARGET_API_API_KEY - the API key sent in the header configured above'],
      };
    case 'custom-header':
      return {
        lines: ['TARGET_API_AUTH_TYPE=custom-header', `TARGET_API_AUTH_HEADER_NAME=${auth.headerName || 'x-auth-token'}`, 'TARGET_API_AUTH_HEADER_VALUE='],
        hints: ['TARGET_API_AUTH_HEADER_VALUE - the static value for the custom header'],
      };
    case 'basic':
      return {
        lines: [
          'TARGET_API_AUTH_TYPE=basic',
          `TARGET_API_BASIC_USERNAME=${auth.username || 'api-user'}`,
          'TARGET_API_BASIC_PASSWORD=',
        ],
        hints: ['TARGET_API_BASIC_USERNAME / TARGET_API_BASIC_PASSWORD - credentials for Basic auth'],
      };
    default:
      return {
        lines: ['TARGET_API_AUTH_TYPE=none'],
        hints: ['No authentication is configured - the generated server calls the API without credentials'],
      };
  }
}

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Boolean secret flag used internally to keep .env.example rendering consistent. */
export const AUTH_REQUIRES_SECRET = (type) => ['bearer', 'api-key', 'custom-header', 'basic'].includes(type);