import { z } from 'zod';
import { ChatService } from '../services/chat.service.js';
import { sseHead } from '../utils/sse.js';

const chatSchema = z.object({
  // Full conversation from the client (previous messages + the new one).
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      content: z.string().nullable().optional(),
    })
  ).min(1).max(60),
  // Optional current user id - sent by the AiChat component from localStorage.
  // The chat service adds it to the model context and injects it into tool
  // payloads whenever a tool schema requires a user id.
  userId: z.string().max(128).optional(),
});

export const chatService = new ChatService();

/**
 * POST /api/chat - streams a Server-Sent Events conversation.
 *
 * Events:
 *   status      { message }
 *   tool_call   { name, args }
 *   tool_result { name, success, summary }
 *   delta       { text }
 *   usage       { usage }
 *   done        {}
 *   error       { message }
 */
export async function chat(req, res) {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid messages payload' } });
  }

  res.writeHead(200, sseHead());
  // ChatService emits normalized events as { type, ...payload } objects;
  // controller-level events use (eventName, data) pairs. Accept both.
  const emit = (event, data) => {
    const name = typeof event === 'object' && event !== null ? event.type : event;
    const payload = typeof event === 'object' && event !== null ? { ...event } : { ...data };
    delete payload.type;
    res.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const result = await chatService.run({ messages: parsed.data.messages, userId: parsed.data.userId, emit });
    emit('done', { ok: result.ok });
    res.end();
  } catch (err) {
    console.error('[chat]', err);
    try {
      emit('error', { message: err instanceof Error ? err.message : 'Unknown error' });
      res.end();
    } catch {
      res.destroy();
    }
  }
}

export async function listTools(_req, res) {
  try {
    const tools = await chatService.listTools();
    res.json({ success: true, data: { tools }, message: 'Tools retrieved' });
  } catch {
    res.json({ success: false, error: { code: 'MCP_UNAVAILABLE', message: 'MCP server is not connected' } });
  }
}