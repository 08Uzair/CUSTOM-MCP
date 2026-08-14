import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/ai_integration_generator'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_STRICT_MAX: z.coerce.number().int().positive().default(10),
  ALLOWED_PRIVATE_HOSTS: z.string().default('localhost,127.0.0.1'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  ARTIFACT_TTL_HOURS: z.coerce.number().int().positive().default(24),
  ARTIFACT_DIR: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable list of missing/invalid variables.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`[env] Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;

/** Comma separated CORS origin list for the frontend. */
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

/** Private hosts explicitly allowed for API discovery (development use only). */
export const allowedPrivateHosts = env.ALLOWED_PRIVATE_HOSTS.split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

export default env;