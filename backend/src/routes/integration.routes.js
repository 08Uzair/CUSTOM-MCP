import { Router } from 'express';
import * as controller from '../controllers/integration.controller.js';
import { validate } from '../middleware/validate.js';
import { apiLimiter, strictLimiter } from '../middleware/rateLimiters.js';
import {
  validateSchema,
  discoverSchema,
  previewSchema,
  generateSchema,
  idParamSchema,
  downloadQuerySchema,
} from '../validators/integration.validator.js';

const router = Router();

// Heavy, outbound-network operations get the strictest rate limit.
router.use(apiLimiter);
router.post('/validate', strictLimiter, validate(validateSchema), controller.validate);
router.post('/discover', strictLimiter, validate(discoverSchema), controller.discover);
router.post('/preview', strictLimiter, validate(previewSchema), controller.preview);
router.post('/generate', strictLimiter, validate(generateSchema), controller.generate);

router.get('/', controller.list);
router.get('/:id', validate(idParamSchema, 'params'), controller.detail);
router.get('/:id/status', validate(idParamSchema, 'params'), controller.status);
router.get('/:id/download', validate(idParamSchema, 'params'), validate(downloadQuerySchema, 'query'), controller.download);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);

export default router;