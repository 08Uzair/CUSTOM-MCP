import { analyzeEndpoints } from '../analyzers/endpoint-analyzer.js';

/**
 * Generation-time adapter between discovered endpoints and generated code.
 *
 * The same shapes produced here are serialized into the generated
 * mcp-server's tool registry (src/config/tools.js), so the runtime adapter
 * inside the generated project can stay generic and reusable.
 */
export function buildToolRegistry(endpoints) {
  return analyzeEndpoints(endpoints).tools;
}

export { analyzeEndpoints };