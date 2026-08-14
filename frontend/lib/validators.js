import { z } from 'zod';

/** Client-side mirrors of the backend validation rules. */

export const urlSchema = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), 'Must start with http:// or https://')
  .refine((v) => !/@/.test(v.split('://')[1] || ''), 'URLs must not contain credentials');

export const appSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(120),
  appUrl: z.union([z.literal(''), z.string().refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must start with http:// or https://')]),
  apiBaseUrl: urlSchema,
});

export const authSchema = z.object({
  type: z.enum(['none', 'bearer', 'api-key', 'custom-header', 'basic']),
  token: z.string().optional(),
  apiKeyHeader: z.string().trim().optional(),
  headerName: z.string().trim().optional(),
  headerValue: z.string().optional(),
  username: z.string().trim().optional(),
  basicPassword: z.string().optional(),
});

export const validateAuthStep = (auth) => {
  if (auth.type === 'bearer') return z.string().min(1, 'Token is required').safeParse(auth.token ?? '').success;
  if (auth.type === 'api-key') return z.string().min(1, 'API key is required').safeParse(auth.token ?? '').success;
  if (auth.type === 'custom-header') {
    return (
      z.string().min(1).safeParse(auth.headerName ?? '').success &&
      z.string().min(1).safeParse(auth.headerValue ?? '').success
    );
  }
  if (auth.type === 'basic') return z.string().min(1).safeParse(auth.username ?? '').success;
  return true;
};

export const aiSchema = z.object({
  provider: z.enum(['groq']),
  model: z.string().trim().min(1, 'Model is required'),
});

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function timeAgo(date) {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}