import { Router } from 'express';
import integrationRoutes from './integration.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'Service healthy' });
});

router.use('/integrations', integrationRoutes);

export default router;