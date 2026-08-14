import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { connectDatabase, isDatabaseConnected } from './config/database.js';
import { corsMiddleware } from './config/cors.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { cleanupOldArtifacts } from './services/integration.service.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(corsMiddleware());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: isDatabaseConnected() ? 'ok' : 'degraded',
      database: isDatabaseConnected() ? 'connected' : 'disconnected',
    },
    message: 'Service healthy',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`[api] AI Integration Generator backend listening on http://localhost:${env.PORT}`);
  connectDatabase()
    .then(() => console.log('[db] MongoDB connected'))
    .catch((err) => console.error('[db] MongoDB connection failed - API works, persistence does not:', err.message));
  cleanupOldArtifacts().then((removed) => {
    if (removed > 0) console.log(`[artifacts] removed ${removed} expired artifact(s)`);
  });
});

// Graceful shutdown: close HTTP + Mongo.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n[api] ${signal} received, shutting down`);
    server.close();
    const { closeDatabase } = await import('./config/database.js');
    await closeDatabase();
    process.exit(0);
  });
}

export default app;