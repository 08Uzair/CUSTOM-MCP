import { z } from 'zod';

export const authSchema = z.object({
  authType: z.enum(['none', 'bearer', 'api-key', 'custom-header', 'basic']).default('none'),
  headerName: z.string().trim().max(100).optional(),
  apiKeyHeader: z.string().trim().max(100).optional(),
  username: z.string().trim().max(200).optional(),
  configured: z.boolean().optional(),
  // TRANSIENT credentials - accepted ONLY for live connection tests. They are
  // used in the request and dropped; never persisted and never generated.
  token: z.string().max(2000).optional(),
  headerValue: z.string().max(2000).optional(),
  basicPassword: z.string().max(2000).optional(),
});

export const aiSchema = z.object({
  provider: z.enum(['groq']).default('groq'),
  model: z.string().trim().max(200).optional(),
});

const payloadFieldSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']).default('string'),
  required: z.boolean().default(false),
  description: z.string().trim().max(300).optional(),
});

const payloadSchema = z.object({
  hasBody: z.boolean().optional(),
  example: z.any().optional(),
  fields: z.array(payloadFieldSchema).max(200).optional(),
});

const endpointSchema = z.object({
  method: z.string().regex(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i),
  path: z.string().min(1).max(500),
  summary: z.string().max(300).optional(),
  params: z.array(z.any()).optional(),
  body: z.any().optional(),
  payload: payloadSchema.optional(),
  source: z.enum(['openapi', 'manual']).optional(),
});

const urlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), 'Must be a valid http(s) URL')
  .refine((v) => !/@/.test(v.split('://')[1] || ''), 'URLs must not contain credentials');

export const validateSchema = z.object({
  appUrl: urlSchema.optional(),
  apiBaseUrl: urlSchema,
  endpoint: z.string().max(500).optional(),
  method: z.string().regex(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i).optional(),
  auth: authSchema.optional(),
});

export const discoverSchema = z.object({
  appUrl: urlSchema.optional(),
  apiBaseUrl: urlSchema,
  auth: authSchema.optional(),
});

const baseDraftSchema = z.object({
  name: z.string().trim().min(2).max(120),
  appUrl: urlSchema.optional(),
  apiBaseUrl: urlSchema,
  auth: authSchema,
  ai: aiSchema,
  discovery: z.record(z.any()).optional(),
  endpoints: z.array(endpointSchema).max(300),
  tools: z.array(z.any()).max(300).optional(),
});

export const previewSchema = baseDraftSchema.partial({ name: true, endpoints: true }).refine(
  (v) => Array.isArray(v.endpoints) && v.endpoints.length > 0,
  { message: 'At least one endpoint is required', path: ['endpoints'] }
);

export const generateSchema = baseDraftSchema.refine(
  (v) => Array.isArray(v.endpoints) && v.endpoints.length > 0,
  { message: 'At least one endpoint is required', path: ['endpoints'] }
);

export const idParamSchema = z.object({
  id: z.string().trim().regex(/^[a-zA-Z0-9-]{1,64}$/),
});

export const downloadQuerySchema = z.object({
  package: z.enum(['complete', 'ai-server', 'mcp-server', 'ai-chat', 'ai-client']).optional(),
});