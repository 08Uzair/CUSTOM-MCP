/**
 * Generates EXPLICIT MCP tool code from the tool registry.
 *
 * Instead of shipping a generic executor, every discovered endpoint becomes
 * a real `server.tool(name, description, zodSchema, handler)` block - the
 * same style as a hand-written MCP server. The generated code lands in the
 * project's `mcp-server/src/tools/registrations.js` and is registered on the
 * high-level `McpServer` instance.
 */

/**
 * @param tools [{ name, description, inputSchema, request }]
 * @returns string - JS source with one `server.tool(...)` call per tool.
 */
export function buildToolsRegistrationCode(tools = []) {
  const blocks = tools.map((tool) => {
    const schema = tool.inputSchema || {};
    const shapeLines = buildShapeLines(schema.properties, schema.required, '    ');
    const schemaCode = shapeLines.length ? `{\n${shapeLines.join('\n')}\n    }` : '{}';
    const request = tool.request || {};
    const requestCode = `{ method: ${JSON.stringify(request.method)}, path: ${JSON.stringify(request.path)}, body: ${request.body ? 'true' : 'false'}, queryParams: ${JSON.stringify(request.queryParams || [])} }`;

    return [
      '  server.tool(',
      `    ${JSON.stringify(tool.name)},`,
      `    ${JSON.stringify(tool.description)},`,
      `    ${schemaCode},`,
      '    async (args) => {',
      '      try {',
      '        return await call(',
      `          ${requestCode},`,
      '          args',
      '        );',
      '      } catch (e) {',
      '        return error(e);',
      '      }',
      '    }',
      '  );',
    ].join('\n');
  });

  return blocks.join('\n\n');
}

/**
 * One JSON Schema object -> zod shape lines, e.g.
 *   "id": z.string().describe("Value for the :id path parameter"),
 * Optional properties get .optional(), described ones .describe().
 */
function buildShapeLines(properties, required, indent) {
  const pad = `${indent}  `;
  const lines = [];
  for (const [name, prop] of Object.entries(properties || {})) {
    let field = buildField(prop, `${indent}    `);
    if (!(required || []).includes(name)) field += '.optional()';
    if (prop.description) field += `.describe(${JSON.stringify(prop.description)})`;
    lines.push(`${pad}${JSON.stringify(name)}: ${field},`);
  }
  return lines;
}

/** One JSON Schema property -> zod expression (recursive for nested payloads). */
function buildField(prop, indent) {
  switch (prop.type) {
    case 'string':
      if (Array.isArray(prop.enum) && prop.enum.length) {
        return `z.enum(${JSON.stringify(prop.enum)})`;
      }
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'integer':
      return 'z.number().int()';
    case 'boolean':
      return 'z.boolean()';
    case 'array': {
      const items = prop.items || {};
      return `z.array(${buildField(items, indent)})`;
    }
    case 'object': {
      if (prop.properties && Object.keys(prop.properties).length) {
        const nested = buildShapeLines(prop.properties, prop.required, indent);
        return `z.object({\n${nested.join('\n')}\n${indent}})`;
      }
      return 'z.record(z.string(), z.any())';
    }
    default:
      return 'z.any()';
  }
}
