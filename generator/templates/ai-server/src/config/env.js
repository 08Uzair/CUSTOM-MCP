import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment contract for the AI server.
 * - AI credentials live only in .env / host environment, never in code.
 * - The MCP server URL is the one gateway for tool execution.
 */
const envSchema = z.object({
  AI_SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  // Used automatically when the primary model is rate-limited (429).
  GROQ_MODEL_FALLBACK: z.string().default('llama-3.3-70b-versatile'),
  GROQ_BASE_URL: z.string().url().default('https://api.groq.com/openai/v1'),
  // Per-request timeout for Groq calls (milliseconds).
  GROQ_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
  // Retry attempts per model on 429 rate-limit responses.
  GROQ_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  MCP_SERVER_URL: z.string().url().default('{{MCP_SERVER_URL}}'),
  // How long a single MCP connect attempt may take (milliseconds).
  MCP_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  // The chat component is copied into YOUR app, so any origin may chat.
  CORS_ORIGINS: z.string().default('*'),
  MAX_TOOL_ROUNDS: z.coerce.number().int().positive().default(5),
  // Only the last N messages (plus system prompt) are sent to the model -
  // keeps requests small, fast and under rate limits.
  MAX_HISTORY_MESSAGES: z.coerce.number().int().positive().default(20),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`[env] Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

export const APP_META = {
  name: '{{PROJECT_NAME}}',
  apiBaseUrl: '{{API_BASE_URL}}',
};