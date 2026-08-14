/**
 * GENERATED - MCP tool registry for {{PROJECT_NAME}}.
 *
 * Each entry is pure data describing ONE tool:
 *   - name / description for the AI to understand
 *   - inputSchema (JSON Schema) for argument validation
 *   - request: how to call the target API through the adapter
 *
 * The executor in services/endpoint.service.js stays generic - adding a tool
 * never requires writing code.
 */
export const TOOLS = {{MCP_TOOLS_CONFIG}};