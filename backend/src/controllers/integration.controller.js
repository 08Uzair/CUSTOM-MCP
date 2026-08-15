import { asyncHandler } from '../middleware/asyncHandler.js';
import { ok, accepted } from '../utils/response.js';
import { Integration } from '../models/Integration.js';
import { GenerationJob } from '../models/GenerationJob.js';
import { GeneratedProject } from '../models/GeneratedProject.js';
import { runValidation, runDiscovery, runPreview } from '../services/integration.service.js';
import { enqueueGeneration, resolveArtifact, deleteIntegration } from '../services/generation.service.js';
import { ApiError } from '../utils/ApiError.js';
import fs from 'node:fs';

/** POST /api/integrations/validate - quick preflight connection test. */
export const validate = asyncHandler(async (req, res) => {
  const result = await runValidation(req.body);
  return ok(res, result, 'Validation completed');
});

/** POST /api/integrations/discover - deep discovery + endpoint analysis. */
export const discover = asyncHandler(async (req, res) => {
  const result = await runDiscovery(req.body);
  return ok(res, result, 'Discovery completed');
});

/** POST /api/integrations/preview - full project plan (tools, ports, env). */
export const preview = asyncHandler(async (req, res) => {
  const plan = await runPreview(req.body);
  return ok(res, plan, 'Preview generated');
});

/** POST /api/integrations/generate - persists and starts an async job. */
export const generate = asyncHandler(async (req, res) => {
  const { integration, job } = await enqueueGeneration(req.body);
  return accepted(res, { integration, job }, 'Generation started');
});

/** GET /api/integrations - list recent integrations. */
export const list = asyncHandler(async (_req, res) => {
  const integrations = await Integration.find().sort({ createdAt: -1 }).limit(100).lean();
  return ok(res, integrations, 'Integrations retrieved');
});

/** GET /api/integrations/:id - integration detail with job + artifacts. */
export const detail = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id).lean();
  if (!integration) throw ApiError.notFound('INTEGRATION_NOT_FOUND', 'Integration not found');

  const [job, project] = await Promise.all([
    GenerationJob.findOne({ integrationId: req.params.id }).sort({ createdAt: -1 }).lean(),
    GeneratedProject.findOne({ integrationId: req.params.id }).lean(),
  ]);

  return ok(res, { integration, job, project }, 'Integration retrieved');
});

/** GET /api/integrations/:id/status - polling endpoint for the wizard. */
export const status = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id).select('name status').lean();
  if (!integration) throw ApiError.notFound('INTEGRATION_NOT_FOUND', 'Integration not found');

  const job = await GenerationJob.findOne({ integrationId: req.params.id })
    .sort({ createdAt: -1 })
    .select('status steps currentStep error result')
    .lean();
  const project = await GeneratedProject.findOne({ integrationId: req.params.id }).select('status artifacts').lean();

  return ok(res, { integration, job, project }, 'Status retrieved');
});

/** GET /api/integrations/:id/download?package=complete|ai-server|mcp-server|ai-chat */
export const download = asyncHandler(async (req, res) => {
  const packageKey = req.query.package || 'complete';
  const artifact = await resolveArtifact(req.params.id, packageKey);
  if (!artifact) throw ApiError.notFound('ARTIFACT_NOT_FOUND', 'No generated artifact available yet');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
  res.setHeader('Content-Length', String(artifact.sizeBytes));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return fs.createReadStream(artifact.filePath).pipe(res);
});

/** DELETE /api/integrations/:id - remove integration + artifacts. */
export const remove = asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id);
  if (!integration) throw ApiError.notFound('INTEGRATION_NOT_FOUND', 'Integration not found');
  await deleteIntegration(req.params.id, integration);
  return ok(res, { deleted: true }, 'Integration deleted');
});