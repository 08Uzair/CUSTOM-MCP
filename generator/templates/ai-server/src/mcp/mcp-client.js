import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { env } from '../config/env.js';

/**
 * MCP client - the AI server's doorway to the generated MCP server.
 *
 * Responsibilities:
 *   - discover tools once at startup (tools/list)
 *   - execute tool calls on behalf of the AI (tools/call)
 *
 * The MCP server is optional at boot: if it is down the chat still works,
 * the AI simply has no tools to call.
 */
export class McpClient {
  constructor(serverUrl = env.MCP_SERVER_URL) {
    this.serverUrl = serverUrl;
    this.client = null;
    this.tools = [];
    this.connected = false;
  }

  async connect() {
    if (this.client) return;

    const client = new Client({ name: '{{PROJECT_SLUG}}-ai-server', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(this.serverUrl));

    try {
      // Bounded connect: never hang the chat on an unreachable MCP server.
      await withTimeout(client.connect(transport), env.MCP_CONNECT_TIMEOUT_MS, 'MCP server connection timed out');
      this.client = client;
      this.connected = true;
      await this.refreshTools();
    } catch (err) {
      console.warn(`[mcp] could not connect to ${this.serverUrl}: ${err.message}`);
      this.tools = [];
      this.connected = false;
      throw err;
    }
  }

  async refreshTools() {
    if (!this.client) return this.tools;
    const result = await this.client.listTools();
    this.tools = (result.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
    return this.tools;
  }

  /** OpenAI-compatible tool list fed to the AI provider. */
  aiToolList() {
    return this.tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema || { type: 'object', properties: {} },
      },
    }));
  }

  async callTool(name, args) {
    if (!this.client) throw new Error('MCP client is not connected');
    const result = await this.client.callTool({ name, arguments: args || {} });

    // Normalize the SDK response into a plain text payload for the AI.
    const raw = Array.isArray(result.content)
      ? result.content.map((c) => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n')
      : JSON.stringify(result);
    return { ok: !result.isError, raw };
  }

  async disconnect() {
    if (this.client) {
      await this.client.close().catch(() => {});
      this.client = null;
      this.connected = false;
      this.tools = [];
    }
  }
}

/** Resolves the promise or rejects after `ms` - guards against hangs. */
function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}