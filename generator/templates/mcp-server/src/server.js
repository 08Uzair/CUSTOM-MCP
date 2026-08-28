import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { env, MCP } from './config/env.js';
import { TOOLS } from './config/tools.js';
import { registerTools } from './tools/registrations.js';
import { buildApiInfoResource } from './resources/api-info.js';

dotenv.config();

// ---------------------------------------------------------------- MCP server
// The high-level McpServer class registers every endpoint as explicit,
// hand-written style tool code - see src/tools/registrations.js, where each
// tool is declared with its own zod schema and handler. The api://info
// resource below exposes static API metadata to MCP clients.
//
// NOTE: one `McpServer` instance is bound to exactly ONE transport/session,
// so a fresh server is created per MCP session and stored in the session map.
function createMcpServer() {
  const server = new McpServer(
    { name: MCP.name, version: MCP.version },
    { capabilities: { tools: {}, resources: {} } }
  );

  // Per-endpoint tool registrations (generated code).
  registerTools(server);

  // Static resource: API overview (base URL, auth type, tool list).
  server.registerResource(
    'API Information',
    'api://info',
    {
      description: 'Overview of the {{PROJECT_NAME}} API connected to this MCP server',
      mimeType: 'application/json',
    },
    async (uri) => {
      const resource = buildApiInfoResource();
      return { contents: [{ uri: uri.href, mimeType: resource.mimeType, text: JSON.stringify(resource.content, null, 2) }] };
    }
  );

  return server;
}

// ------------------------------------------------------------- HTTP transport
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Session-scoped transports + server instances (Streamable HTTP keeps state
// per MCP session - one Server is bound to one transport).
const sessions = new Map();
const sessionLastSeen = new Map();

app.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  let session = sessionId ? sessions.get(sessionId) : undefined;

  if (!session) {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      // The session id is only generated while the initialize request is
      // handled - register the real id here so later requests find it.
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server });
        sessionLastSeen.set(id, Date.now());
      },
    });
    session = { transport, server };
    await server.connect(transport);
  } else {
    sessionLastSeen.set(sessionId, Date.now());
  }

  try {
    await session.transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('[mcp] transport error:', error);
    if (!res.headersSent) res.status(500).json({ success: false, error: { code: 'TRANSPORT_ERROR', message: error.message } });
  }
});

app.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'No MCP session for this id' } });
  }
  await session.transport.handleRequest(req, res);
});

app.delete('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  const session = sessions.get(sessionId);
  if (session) {
    sessions.delete(sessionId);
    sessionLastSeen.delete(sessionId);
    await session.transport.handleRequest(req, res);
    await session.server.close();
  }
  res.status(200).end();
});

// Periodic cleanup of idle sessions (12h idle timeout).
setInterval(() => {
  const cutoff = Date.now() - 12 * 60 * 60 * 1000;
  for (const [id, lastSeen] of sessionLastSeen) {
    if (lastSeen < cutoff) {
      sessions.delete(id);
      sessionLastSeen.delete(id);
    }
  }
}, 60 * 60 * 1000).unref();

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', tools: TOOLS.length, transport: 'streamable-http' } });
});

app.listen(env.MCP_SERVER_PORT, () => {
  console.log(`[mcp-server] ${MCP.name} listening on http://localhost:${env.MCP_SERVER_PORT}`);
  console.log(`[mcp-server] ${TOOLS.length} tool(s) registered for ${env.TARGET_API_BASE_URL}`);
  console.log(`[mcp-server] MCP endpoint: POST http://localhost:${env.MCP_SERVER_PORT}/mcp`);
});
