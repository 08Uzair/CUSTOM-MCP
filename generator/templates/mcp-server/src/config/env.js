import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment contract of the generated MCP server.
 * Every value can be overridden in .env - nothing is hardcoded.
 */
const envSchema = z.object({
  // MCP transport
  MCP_SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  // ---- Target API (the application this MCP server talks to) ----
  TARGET_API_BASE_URL: z.string().min(1).default('{{API_BASE_URL}}'),
  TARGET_API_AUTH_TYPE: z
    .enum(['none', 'bearer', 'api-key', 'custom-header', 'basic'])
    .default('{{API_AUTH_TYPE}}'),
  TARGET_API_AUTH_HEADER_NAME: z.string().default('x-auth-token'),
  TARGET_API_AUTH_HEADER_VALUE: z.string().default(''),
  TARGET_API_API_KEY_HEADER: z.string().default('x-api-key'),
  TARGET_API_API_KEY: z.string().default(''),
  TARGET_API_TOKEN: z.string().default(''),
  TARGET_API_BASIC_USERNAME: z.string().default(''),
  TARGET_API_BASIC_PASSWORD: z.string().default(''),
  TARGET_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`[env] Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

export const MCP = {
  name: '{{PROJECT_SLUG}}-mcp-server',
  version: '1.0.0',
};