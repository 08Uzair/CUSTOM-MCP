import OpenAI from 'openai';
import { env } from '../config/env.js';

/**
 * Groq provider - talks to Groq's OpenAI-compatible API through the official
 * OpenAI SDK (Responses API), exactly like the Groq quick-start example:
 *
 *   const client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
 *   await client.responses.create({ model: FIXED_MODEL, input: '...' });
 *
 * Resilience (the app stays usable even when a shared model is rate-limited):
 *   - every request carries a timeout (GROQ_TIMEOUT_MS)
 *   - 429 rate-limit responses are retried with exponential backoff
 *     (honouring the Retry-After header when Groq sends one)
 *   - when the primary model keeps hitting its limit, requests fall back to
 *     GROQ_MODEL_FALLBACK automatically - the chat keeps working
 *   - failures are translated into human-readable error messages
 */
export class GroqProvider {
  constructor() {
    this.client = new OpenAI({
      apiKey: env.GROQ_API_KEY,
      baseURL: env.GROQ_BASE_URL,
      maxRetries: 0, // retries are handled here with backoff + model fallback
      timeout: env.GROQ_TIMEOUT_MS,
    });
    this.model = env.GROQ_MODEL;
    this.fallbackModel = env.GROQ_MODEL_FALLBACK;
    this.usingFallback = false;
  }

  /** Non-streaming completion - kept for interface parity; chat uses stream(). */
  async complete({ messages, tools = [] }) {
    return this.#withResilience(async (model) => {
      const response = await this.client.responses.create({
        model,
        input: toResponsesInput(messages),
        tools: toResponsesTools(tools),
        temperature: 0.6,
      });

      const functionCalls = (response.output || [])
        .filter((item) => item.type === 'function_call')
        .map((item) => ({
          id: item.call_id,
          name: item.name,
          arguments: parseArguments(item.arguments),
        }));

      return {
        content: response.output_text || '',
        toolCalls: functionCalls,
        usage: response.usage || null,
        finishReason: response.status === 'completed' ? 'stop' : response.status || null,
      };
    });
  }

  /**
   * Streaming completion - yields normalized chunks:
   *   { type: 'content_delta', text }
   *   { type: 'tool_calls', toolCalls } (aggregated)
   *   { type: 'usage', usage }
   *
   * A rate-limited stream is only retried before ANY delta reached the
   * caller - retrying mid-stream would duplicate text in the UI.
   */
  async *stream({ messages, tools = [] }) {
    const models = this.#modelChain();
    let lastErr = null;

    for (const model of models) {
      for (let attempt = 0; attempt < env.GROQ_MAX_RETRIES; attempt += 1) {
        let emitted = false;
        try {
          const stream = await this.client.responses.create({
            model,
            input: toResponsesInput(messages),
            tools: toResponsesTools(tools),
            temperature: 0.6,
            stream: true,
          });

          const toolCallsBuffer = new Map();

          for await (const event of stream) {
            switch (event.type) {
              case 'error':
                throw new Error(event.error?.message || 'Groq streaming error');

              case 'response.failed':
                throw new Error(event.response?.error?.message || 'Groq request failed');

              case 'response.output_text.delta':
                emitted = true;
                yield { type: 'content_delta', text: event.delta };
                break;

              case 'response.function_call_arguments.delta': {
                const existing = toolCallsBuffer.get(event.item_id) || { name: '', arguments: '' };
                if (event.delta) existing.arguments += event.delta;
                toolCallsBuffer.set(event.item_id, existing);
                break;
              }

              case 'response.function_call_arguments.done': {
                const existing = toolCallsBuffer.get(event.item_id) || { name: '', arguments: '' };
                existing.name = event.name || existing.name;
                if (event.arguments) existing.arguments = event.arguments;
                toolCallsBuffer.set(event.item_id, existing);
                break;
              }

              case 'response.completed': {
                for (const item of event.response?.output || []) {
                  if (item.type === 'function_call') {
                    const existing = toolCallsBuffer.get(item.id) || { name: item.name, arguments: '' };
                    existing.name = item.name || existing.name;
                    existing.arguments = item.arguments || existing.arguments;
                    toolCallsBuffer.set(item.id, existing);
                  }
                }
                const toolCalls = [...toolCallsBuffer.entries()].map(([id, call]) => ({
                  id,
                  name: call.name,
                  arguments: parseArguments(call.arguments),
                }));
                if (toolCalls.length > 0) yield { type: 'tool_calls', toolCalls };
                yield { type: 'usage', usage: event.response?.usage || null };
                return;
              }

              default:
                break;
            }
          }
          return;
        } catch (err) {
          lastErr = err;
          if (!isRateLimit(err) || emitted) throw this.#friendlyError(err);
          await sleep(this.#backoffMs(err, attempt));
        }
      }
    }

    throw this.#friendlyError(lastErr);
  }

  /** Order of models to try: primary, then fallback (if configured). */
  #modelChain() {
    const models = [this.model];
    if (this.fallbackModel && this.fallbackModel !== this.model) models.push(this.fallbackModel);
    return models;
  }

  /**
   * Runs `fn(model)` against each model in the chain, retrying 429s with
   * backoff. Throws a readable error when every attempt fails.
   */
  async #withResilience(fn) {
    const models = this.#modelChain();
    let lastErr = null;

    for (const model of models) {
      for (let attempt = 0; attempt < env.GROQ_MAX_RETRIES; attempt += 1) {
        try {
          return await fn(model);
        } catch (err) {
          lastErr = err;
          if (!isRateLimit(err)) throw this.#friendlyError(err);
          await sleep(this.#backoffMs(err, attempt));
        }
      }
    }

    throw this.#friendlyError(lastErr);
  }

  #backoffMs(err, attempt) {
    const retryAfter = Number(
      err?.headers?.get?.('retry-after') ??
        err?.headers?.['retry-after'] ??
        0
    );
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(retryAfter * 1000, 30_000);
    }
    return Math.min(800 * 2 ** attempt + Math.random() * 400, 10_000);
  }

  #friendlyError(err) {
    if (isRateLimit(err)) {
      return new Error(
        `Groq rate limit reached for ${this.model}` +
          (this.usingFallback ? '' : ` (${this.fallbackModel} is the automatic fallback)`) +
          `. Wait a moment and try again.`
      );
    }
    if (err?.status === 401 || /invalid.*api.?key|unauthorized/i.test(err?.message || '')) {
      return new Error('Invalid Groq API key. Check GROQ_API_KEY in the ai-server/.env file.');
    }
    if (err?.status === 404) {
      return new Error(`Groq model "${this.model}" was not found. Check GROQ_MODEL in the ai-server/.env file.`);
    }
    return err instanceof Error ? err : new Error(String(err?.message || 'Unknown Groq error'));
  }
}

function isRateLimit(err) {
  if (!err) return false;
  const message = err.message || '';
  return err.status === 429 || /rate.?limit|too many requests|tokens? per (minute|second)|requests? per/i.test(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Converts chat-completions style history into Responses API input items:
 *   system/user messages -> plain role messages
 *   assistant tool calls  -> function_call items
 *   tool results          -> function_call_output items
 */
function toResponsesInput(messages) {
  const items = [];

  for (const message of messages || []) {
    switch (message.role) {
      case 'system':
        items.push({ role: 'system', content: message.content });
        break;
      case 'user':
        items.push({ role: 'user', content: message.content });
        break;
      case 'assistant':
        if (typeof message.content === 'string' && message.content.length > 0) {
          items.push({ type: 'message', role: 'assistant', content: message.content });
        }
        for (const call of message.tool_calls || []) {
          items.push({
            type: 'function_call',
            call_id: call.id,
            name: call.function?.name,
            arguments: call.function?.arguments || '{}',
          });
        }
        break;
      case 'tool':
        items.push({
          type: 'function_call_output',
          call_id: message.tool_call_id,
          output: message.content || '',
        });
        break;
      default:
        break;
    }
  }

  return items;
}

/** Converts OpenAI-compatible function tools to Responses API tool items. */
function toResponsesTools(tools = []) {
  return tools.map((tool) => {
    const fn = tool.function || tool;
    return {
      type: 'function',
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters || { type: 'object', properties: {} },
    };
  });
}

function parseArguments(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
