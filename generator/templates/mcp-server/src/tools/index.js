import { z } from 'zod';
import { TOOLS } from '../config/tools.js';

/**
 * Tool registry consumed by the MCP server and the tool executor.
 * - `inputSchema` is the pristine JSON Schema advertised to MCP clients.
 * - `zodSchema` is derived at module load for runtime validation.
 */
export const toolDefinitions = TOOLS.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
  request: tool.request,
  zodSchema: buildZodSchema(tool.inputSchema),
}));

export const toolMap = new Map(toolDefinitions.map((t) => [t.name, t]));

/** Converts the generated JSON Schema into a Zod schema for validation. */
function buildZodSchema(jsonSchema) {
  const shape = {};
  for (const [name, prop] of Object.entries(jsonSchema?.properties || {})) {
    let field = z.any();
    switch (prop.type) {
      case 'string':
        field = z.string();
        break;
      case 'number':
        field = z.number();
        break;
      case 'integer':
        field = z.number().int();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'array':
        field = z.array(z.any());
        break;
      case 'object':
        field = z.object({}).passthrough();
        break;
      default:
        field = z.any();
    }
    if (field !== z.any() && (prop.description || prop.title)) {
      field = field.describe(prop.description || prop.title);
    }
    shape[name] = field;
  }
  return z.object(shape);
}

/** Validates + coerces raw MCP arguments into a clean call payload. */
export function parseArguments(tool, args = {}) {
  const parsed = tool.zodSchema.safeParse(args ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid arguments for ${tool.name}: ${issues}`);
  }
  return parsed.data;
}