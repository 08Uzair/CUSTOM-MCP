import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { env } from './config/env.js';
import { chatRoutes } from './routes/chat.routes.js';
import { chatService } from './controllers/chat.controller.js';

dotenv.config();

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
      if (!origin || allowed.length === 0 || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed'));
    },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', provider: 'groq', model: env.GROQ_MODEL, mcp: env.MCP_SERVER_URL },
    message: 'AI server healthy',
  });
});

app.use('/api', chatRoutes);

// Central error handling - never leak details to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
});

app.listen(env.AI_SERVER_PORT, () => {
  console.log(`[ai-server] listening on http://localhost:${env.AI_SERVER_PORT}`);
  console.log(`[ai-server] model: ${env.GROQ_MODEL} | fallback: ${env.GROQ_MODEL_FALLBACK} | MCP: ${env.MCP_SERVER_URL}`);
  // Warm up the MCP connection in the background so the FIRST chat message
  // does not have to wait for the connection round-trip.
  chatService.ensureMcp().catch(() => {});
});