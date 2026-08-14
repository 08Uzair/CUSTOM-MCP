import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from '../utils/template-engine.js';
import { renderTokenizedFile } from './render.service.js';
import { buildProjectConfig } from './configuration.service.js';
import { documentationTokens } from './documentation.service.js';
import { zipDirectory, sha256OfFile } from '../zip/zip.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');

const SERVICE_TEMPLATES = ['ai-server', 'mcp-server', 'ai-client'];

/**
 * The main generation pipeline:
 *   plan config -> render templates -> write env/docs/compose -> zip all.
 * The result is a fully independent project; nothing here references the
 * generator runtime afterwards.
 */
export async function generateProject(config) {
  const projectConfig = buildProjectConfig(config);
  const tokens = buildTokens(projectConfig);

  const artifactsRoot = path.resolve(config.artifactsDir || path.resolve(__dirname, '..', '..', 'generated'));
  const safeId = String(config.id || Date.now()).replace(/[^a-zA-Z0-9-]/g, '');
  const projectDir = path.join(artifactsRoot, safeId, `${projectConfig.projectSlug}-generated-ai-integration`);

  // Fresh output directory every run.
  await fs.rm(projectDir, { recursive: true, force: true });
  await fs.mkdir(projectDir, { recursive: true });

  const templateRoot = path.join(TEMPLATES_DIR);

  // 1. Render the three service templates.
  for (const service of SERVICE_TEMPLATES) {
    await renderTemplate(path.join(templateRoot, service), path.join(projectDir, service), tokens);
  }

  // 2. Render project-level files (README, docker-compose, .gitignore, run.ps1).
  const docsDir = path.join(templateRoot, 'project-docs');
  const projectReadme = await renderTokenizedFile(
    path.join(docsDir, 'README.md'),
    path.join(projectDir, 'README.md'),
    documentationTokens(projectConfig)
  );
  void projectReadme;
  await renderTokenizedFile(path.join(docsDir, 'docker-compose.yml'), path.join(projectDir, 'docker-compose.yml'), tokens);
  await renderTokenizedFile(path.join(docsDir, '.gitignore'), path.join(projectDir, '.gitignore'), tokens);
  await renderTokenizedFile(path.join(docsDir, 'run.ps1'), path.join(projectDir, 'run.ps1'), tokens);

  // 3. VS Code multi-root workspace so all three services open in one window.
  await fs.writeFile(
    path.join(projectDir, `${projectConfig.projectSlug}.code-workspace`),
    `${JSON.stringify(
      {
        name: projectConfig.projectName,
        folders: [{ path: 'mcp-server' }, { path: 'ai-server' }, { path: 'ai-client' }],
        settings: {},
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  // 4. Write .env.example files (config-driven, secret values always empty).
  await writeEnvExamples(projectDir, projectConfig);

  // 5. Build ZIPs - complete project + one per service.
  const artifacts = await buildZips(projectDir, artifactsRoot, safeId, projectConfig);

  return {
    projectName: projectConfig.projectName,
    version: projectConfig.version,
    projectDir,
    slug: safeId,
    services: {
      aiServer: path.join(projectDir, 'ai-server'),
      mcpServer: path.join(projectDir, 'mcp-server'),
      aiClient: path.join(projectDir, 'ai-client'),
    },
    artifacts,
  };
}

async function writeEnvExamples(projectDir, config) {
  const { auth, ai, ports } = config;

  const aiServerEnv = [
    '# AI Server environment configuration',
    `# Port the AI server listens on`,
    `AI_SERVER_PORT=${ports.aiServer}`,
    '',
    '# Groq credentials - create an account at https://console.groq.com to get a key',
    'GROQ_API_KEY=',
    `GROQ_MODEL=${ai.model}`,
    '# Used automatically when the primary model is rate-limited',
    'GROQ_MODEL_FALLBACK=llama-3.3-70b-versatile',
    'GROQ_BASE_URL=https://api.groq.com/openai/v1',
    '# Per-request timeout for Groq calls (milliseconds)',
    'GROQ_TIMEOUT_MS=90000',
    '# Retry attempts on 429 rate-limit responses (per model)',
    'GROQ_MAX_RETRIES=3',
    '',
    `# URL of the generated MCP server (talking locally or inside docker)`,
    `MCP_SERVER_URL=http://localhost:${ports.mcpServer}/mcp`,
    '',
    `# Allowed browser origins for the AI client`,
    `CORS_ORIGINS=http://localhost:${ports.aiClient}`,
    '',
    '# Tool-calling rounds and history window sent to the model',
    'MAX_TOOL_ROUNDS=5',
    'MAX_HISTORY_MESSAGES=20',
  ].join('\n');

  const mcpServerEnv = [
    '# MCP Server - target API configuration',
    `# Port the MCP server listens on`,
    `MCP_SERVER_PORT=${ports.mcpServer}`,
    '',
    `# Your application API base URL - everything the MCP server calls starts from here`,
    `TARGET_API_BASE_URL=${config.apiBaseUrl}`,
    '',
    ...auth.env.lines,
    '',
    '# Request timeout for target API calls (milliseconds)',
    'TARGET_API_TIMEOUT_MS=10000',
  ].join('\n');

  const aiClientEnv = [
    '# AI Client configuration',
    `# Where the AI server lives (browser context - use localhost when running locally)`,
    `NEXT_PUBLIC_API_URL=http://localhost:${ports.aiServer}`,
  ].join('\n');

  await fs.writeFile(path.join(projectDir, 'ai-server', '.env.example'), `${aiServerEnv}\n`, 'utf8');
  await fs.writeFile(path.join(projectDir, 'mcp-server', '.env.example'), `${mcpServerEnv}\n`, 'utf8');
  await fs.writeFile(path.join(projectDir, 'ai-client', '.env.example'), `${aiClientEnv}\n`, 'utf8');
}

async function buildZips(projectDir, artifactsRoot, safeId, config) {
  const { projectSlug } = config;
  const makeMeta = async (name) => {
    const filePath = path.join(artifactsRoot, name);
    const { sizeBytes } = await zipDirectory(projectDir, filePath);
    const sha256 = await sha256OfFile(filePath);
    return { fileName: name, filePath, sizeBytes, sha256, createdAt: new Date() };
  };

  const complete = await makeMeta(`${projectSlug}-complete.zip`);

  // Per-service archives zip each sub-directory independently.
  const parts = {
    aiServer: await makeMetaFrom(path.join(projectDir, 'ai-server'), artifactsRoot, `${projectSlug}-ai-server.zip`),
    mcpServer: await makeMetaFrom(path.join(projectDir, 'mcp-server'), artifactsRoot, `${projectSlug}-mcp-server.zip`),
    aiClient: await makeMetaFrom(path.join(projectDir, 'ai-client'), artifactsRoot, `${projectSlug}-ai-client.zip`),
  };

  return { complete, parts };
}

async function makeMetaFrom(sourceDir, artifactsRoot, fileName) {
  const filePath = path.join(artifactsRoot, fileName);
  const { sizeBytes } = await zipDirectory(sourceDir, filePath);
  const sha256 = await sha256OfFile(filePath);
  return { fileName, filePath, sizeBytes, sha256, createdAt: new Date() };
}

/** Renders all template tokens for one project. */
function buildTokens(projectConfig) {
  return {
    PROJECT_NAME: projectConfig.projectName,
    PROJECT_SLUG: projectConfig.projectSlug,
    APP_URL: projectConfig.appUrl,
    API_BASE_URL: projectConfig.apiBaseUrl,
    API_AUTH_TYPE: projectConfig.auth.type,
    AI_PROVIDER: projectConfig.ai.provider,
    AI_MODEL: projectConfig.ai.model,
    PORT_AI_CLIENT: projectConfig.ports.aiClient,
    PORT_AI_SERVER: projectConfig.ports.aiServer,
    PORT_MCP_SERVER: projectConfig.ports.mcpServer,
    MCP_SERVER_URL: projectConfig.mcp.serverUrl,
    MCP_TOOLS_CONFIG: JSON.stringify(projectConfig.tools, null, 2),
  };
}

/** Deletes artifact folders older than `ttlHours`. Returns count removed. */
export async function cleanupArtifacts({ ttlHours = 24 } = {}) {
  const root = path.resolve(
    String(process.env.ARTIFACT_DIR || path.join(__dirname, '..', '..', 'generated'))
  );
  let removed = 0;
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
    for (const entry of entries) {
      const full = path.join(root, entry.name);
      try {
        const stat = await fs.stat(full);
        if (stat.isDirectory() && stat.mtimeMs < cutoff) {
          await fs.rm(full, { recursive: true, force: true });
          removed += 1;
        }
        if (stat.isFile() && entry.name.endsWith('.zip') && stat.mtimeMs < cutoff) {
          await fs.unlink(full);
          removed += 1;
        }
      } catch {
        /* keep going */
      }
    }
  } catch {
    return 0;
  }
  return removed;
}