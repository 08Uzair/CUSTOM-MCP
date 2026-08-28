import { env, APP_META } from '../config/env.js';
import { createAiProvider } from '../providers/ai-provider.js';
import { McpClient } from '../mcp/mcp-client.js';

/**
 * Chat orchestrator - the AI conversation loop, fully streaming:
 *
 *   client messages
 *     -> system prompt + trimmed history
 *     -> streaming AI turn (text streams to the client WHILE the model thinks)
 *     -> if tool_calls: execute on the MCP server, feed results back
 *     -> repeat (bounded by MAX_TOOL_ROUNDS) - the final answer is streamed
 *
 * Because every turn is streamed, the client sees text appear immediately
 * instead of waiting for the whole (non-streaming) tool-calling round to
 * finish - this removes most of the perceived latency.
 *
 * `emit` receives normalized events:
 *   { type: 'status', message }, { type: 'tool_call', name, args },
 *   { type: 'tool_result', name, success, summary }, { type: 'delta', text },
 *   { type: 'usage', usage }
 */
export class ChatService {
  constructor() {
    this.provider = createAiProvider('groq');
    this.mcp = new McpClient();
    this._connected = false;
    this._connectFailedAt = 0;
  }

  /**
   * Connects to the MCP server once, without ever blocking a chat for long:
   * a recent failed attempt is treated as "unavailable" for 30s so the AI
   * can still answer without tools instead of hanging the request.
   */
  async ensureMcp() {
    if (this._connected) return true;
    if (this._connectFailedAt && Date.now() - this._connectFailedAt < 30_000) {
      return false;
    }
    try {
      await this.mcp.connect();
      this._connected = true;
      this._connectFailedAt = 0;
    } catch {
      this._connectFailedAt = Date.now();
      this.mcp.connected = false;
    }
    return this.mcp.connected;
  }

  #systemPrompt(userId) {
    const toolNames = this.mcp.tools.map((t) => t.name).join(', ') || 'none available';
    // Replaced at generation time with the strict per-tool payload formats
    // defined in the wizard (step 5) - or an empty string when none exist.
    const payloadGuide = {{AI_TOOL_PAYLOAD_GUIDE}};
    const userContext = userId
      ? ` The current user's ID is "${userId}". When you call a tool that needs a user identifier, always pass this exact ID.`
      : '';
    return {
      role: 'system',
      content:
        `You are an AI assistant for ${APP_META.name}, backed by a ${env.GROQ_MODEL} model. ` +
        `You can inspect the application's API (${APP_META.apiBaseUrl}) through these MCP tools: ${toolNames}. ` +
        `When the user asks about the application's data, call the matching tool, wait for its result, ` +
        `then answer using the returned data. Never invent data - if a tool fails or is missing, say so. ` +
        `Keep answers concise and technical.` + userContext +
        (payloadGuide ? `\n\n${payloadGuide}` : ''),
    };
  }

  async run({ messages, emit, userId }) {
    if (!messages?.length) throw new Error('No messages provided');
    if (!env.GROQ_API_KEY) {
      await emit({ type: 'error', message: 'GROQ_API_KEY is not configured. Set it in the ai-server/.env file.' });
      return { ok: false };
    }

    await emit({ type: 'status', message: 'Connecting to MCP server...' });
    const mcpConnected = await this.ensureMcp();
    await emit({ type: 'status', message: mcpConnected ? 'Connected to MCP server' : 'MCP server unavailable (AI will answer without tools)' });

    // Only the most recent messages go to the model - smaller payloads are
    // faster and far less likely to trip Groq's rate limits.
    const history = [{ role: 'system', content: this.#systemPrompt(userId).content }, ...trimHistory(messages, env.MAX_HISTORY_MESSAGES)];
    let current = history;

    // ---- Tool-calling loop (bounded) ----
    for (let round = 0; round < env.MAX_TOOL_ROUNDS; round += 1) {
      await emit({ type: 'status', message: 'Thinking...' });

      const turn = await this.#streamTurn(current, emit);

      if (!turn.toolCalls?.length) {
        // No tools requested - the answer already streamed to the client.
        if (!turn.content) await emit({ type: 'delta', text: 'I have nothing to add.' });
        await emit({ type: 'usage', usage: turn.usage });
        return { ok: true };
      }

      await emit({ type: 'status', message: 'Executing tools...' });
      const assistantTurn = {
        role: 'assistant',
        content: turn.content || null,
        tool_calls: turn.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
        })),
      };
      current = [...current, assistantTurn];

      const toolMessages = [];
      for (const call of turn.toolCalls) {
        let executed;
        try {
          await emit({ type: 'tool_call', name: call.name, args: call.arguments });
          // If the tool's schema wants a user id and the model did not fill
          // it in, inject the request's userId automatically - API routes
          // that require it always receive it.
          executed = await this.mcp.callTool(call.name, this.#withUserId(call.name, call.arguments, userId));
        } catch (err) {
          executed = { ok: false, raw: JSON.stringify({ error: err.message }) };
        }
        await emit({ type: 'tool_result', name: call.name, success: executed.ok, summary: summarize(executed.raw) });
        toolMessages.push({ role: 'tool', tool_call_id: call.id, content: executed.raw.slice(0, 20_000) });
      }
      current = [...current, ...toolMessages];
    }

    // Safety valve: too many rounds - one more streaming turn and stop.
    await emit({ type: 'status', message: 'Generating response...' });
    await this.#streamTurn(current, emit);
    return { ok: true };
  }

  /**
   * One streaming turn. Text deltas are forwarded to the client as they
   * arrive (so the UI fills in live), tool calls are aggregated, and the
   * turn's usage is returned.
   */
  async #streamTurn(messages, emit) {
    const contentParts = [];
    let toolCalls = [];
    let usage = null;

    for await (const chunk of this.provider.stream({ messages, tools: this.mcp.aiToolList() })) {
      switch (chunk.type) {
        case 'content_delta':
          contentParts.push(chunk.text);
          await emit({ type: 'delta', text: chunk.text });
          break;
        case 'tool_calls':
          toolCalls = chunk.toolCalls || [];
          break;
        case 'usage':
          usage = chunk.usage;
          break;
        default:
          break;
      }
    }

    return { content: contentParts.join(''), toolCalls, usage };
  }

  async listTools() {
    await this.ensureMcp();
    return this.mcp.tools;
  }

  /**
   * Injects the current user id into tool arguments when the tool's input
   * schema declares a user-identifier property (userId / user_id / ...) and
   * the model did not provide it.
   */
  #withUserId(toolName, args, userId) {
    if (!userId || !args) return args;
    const tool = this.mcp.tools.find((t) => t.name === toolName);
    const schema = tool?.inputSchema;
    if (!schema?.properties) return args;

    const userField = Object.keys(schema.properties).find((field) => /user/i.test(field) && /id/i.test(field));
    if (!userField) return args;

    const current = args[userField];
    if (current === undefined || current === null || current === '') {
      return { ...args, [userField]: userId };
    }
    return args;
  }
}

/** Keeps only the last `max` messages (the system prompt is added separately). */
function trimHistory(messages, max) {
  if (messages.length <= max) return messages;
  return messages.slice(-max);
}

function summarize(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.success !== undefined) return parsed.success ? 'ok' : `error: ${parsed.error?.message || 'unknown'}`;
    return 'completed';
  } catch {
    return raw.slice(0, 120);
  }
}
