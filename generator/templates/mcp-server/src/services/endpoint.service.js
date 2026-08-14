import { toolMap, parseArguments } from '../tools/index.js';
import { executeTargetRequest } from '../adapters/api-adapter.js';
import { TargetApiError } from '../utils/errors.js';

/**
 * Generic tool executor - one function serves every generated tool.
 *
 * Pipeline: validate args (Zod) -> build request (adapter) -> call target API
 * -> normalize response. Error handling is centralized here so tools never
 * leak raw internals to the caller.
 */
export async function executeTool(name, args) {
  const tool = toolMap.get(name);
  if (!tool) {
    throw new TargetApiError(400, 'TOOL_NOT_FOUND', `Unknown tool: ${name}`);
  }

  const validated = parseArguments(tool, args);
  const result = await executeTargetRequest(tool.request, validated);

  // Normalize: the MCP content is always JSON with a stable shape.
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: true, data: result.data, meta: result.meta }, null, 2),
      },
    ],
  };
}