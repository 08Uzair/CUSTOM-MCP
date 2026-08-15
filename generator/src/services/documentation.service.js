import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Generates the documentation files for a project from templates:
 *   README.md (root), ai-server/README.md, mcp-server/README.md,
 *   docker-compose.yml and .gitignore.
 *
 * The template READMEs contain {{TOKENS}}; the dynamic parts (tool tables,
 * auth hints) are produced here and injected before rendering.
 */
export async function generateDocumentation(projectDir, projectConfig, templateDir) {
  const tokens = documentationTokens(projectConfig);
  const docTemplateDir = path.join(templateDir, 'project-docs');

  await fs.mkdir(projectDir, { recursive: true });
  const { renderTokenizedFile } = await import('./render.service.js');
  await renderTokenizedFile(path.join(docTemplateDir, 'README.md'), path.join(projectDir, 'README.md'), tokens);
}

export function documentationTokens(projectConfig) {
  const { projectName, appUrl, apiBaseUrl, auth, ai, tools, ports } = projectConfig;
  const toolTable = tools
    .map((t) => `| \`${t.name}\` | ${t.description} |`)
    .join('\n');
  const authHints = auth.env.hints.map((h) => `- ${h}`).join('\n');

  return {
    PROJECT_NAME: projectName,
    PROJECT_SLUG: projectConfig.projectSlug,
    APP_URL: appUrl || 'not provided',
    API_BASE_URL: apiBaseUrl,
    API_AUTH_TYPE: auth.type.toUpperCase(),
    AUTH_HINTS: authHints,
    AI_PROVIDER: ai.provider.toUpperCase(),
    AI_MODEL: ai.model,
    MCP_TOOLS_COUNT: String(tools.length),
    MCP_TOOLS_TABLE: toolTable,
    PORT_AI_SERVER: ports.aiServer,
    PORT_MCP_SERVER: ports.mcpServer,
    TOOL_EXAMPLES: toolExamples(tools),
  };
}

/** A few ready-to-run MCP tool invocation examples for the README. */
function toolExamples(tools) {
  const samples = tools.slice(0, 3);
  return samples
    .map((t) => {
      const exampleArgs = JSON.stringify(sampleArgsFor(t), null, 2).replace(/\n/g, '\n    ');
      return `#### ${t.name}\n\n\`\`\`js\nawait client.callTool({\n  name: '${t.name}',\n  arguments: ${exampleArgs}\n});\n\`\`\``;
    })
    .join('\n\n');
}

function sampleArgsFor(tool) {
  const args = {};
  for (const name of tool.inputSchema?.required || []) {
    args[name] = name === 'id' ? '1' : 'example';
  }
  return args;
}