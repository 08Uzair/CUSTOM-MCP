/**
 * AI Provider abstraction - the ONLY difference between providers is how
 * `complete()` and `stream()` talk to the vendor API.
 *
 * To add a provider later (OpenAI, Anthropic, Gemini, Ollama, OpenRouter):
 *   1. create providers/<name>.provider.js implementing the same interface
 *   2. register it in the registry below
 * The rest of the system (chat service, MCP execution, streaming) is untouched.
 *
 * Interface:
 *   complete({ messages, tools }) -> { content, toolCalls, usage, finishReason }
 *   stream({ messages, tools })   -> AsyncGenerator of stream chunks
 */
import { GroqProvider } from './groq.provider.js';

const registry = {
  groq: GroqProvider,
};

export function createAiProvider(providerName = 'groq') {
  const Provider = registry[providerName];
  if (!Provider) {
    throw new Error(`Unsupported AI provider: ${providerName}. Available: ${Object.keys(registry).join(', ')}`);
  }
  return new Provider();
}