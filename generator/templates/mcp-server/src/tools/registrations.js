import { z } from 'zod';
import { executeTargetRequest } from '../adapters/api-adapter.js';

/**
 * GENERATED - explicit MCP tool registrations for {{PROJECT_NAME}}.
 *
 * Every endpoint discovered on the target API is declared here as its own
 * server.tool(...) block: a zod input schema and a dedicated handler, exactly
 * like a hand-written MCP server. To add, change or remove a tool, edit the
 * block below (or regenerate the project from the wizard).
 *
 * Handlers only build the request descriptor; the API adapter
 * (src/adapters/api-adapter.js) resolves base URL, authentication headers,
 * query parameters, timeout and error handling - all configured through .env.
 */

/** Standard MCP text result envelope. */
const text = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });

/** Standard MCP error envelope - isError marks the tool call as failed. */
const error = (e) => {
  const message = e?.message || String(e ?? 'Unknown tool error');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, error: { code: e?.code || 'TOOL_EXECUTION_ERROR', message } }, null, 2),
      },
    ],
    isError: true,
  };
};

/** Runs one target request through the adapter and returns the MCP result. */
async function call(request, args) {
  const result = await executeTargetRequest(request, args);
  return text({ success: true, data: result.data, meta: result.meta });
}

/**
 * Registers every tool on the MCP server. Called once per session in
 * server.js right after the McpServer instance is created.
 */
export function registerTools(server) {
{{MCP_TOOLS_CODE}}
}
