import path from 'node:path';
import fs from 'node:fs/promises';
import * as generator from '@aig/generator';
import env from '../config/env.js';
import { Integration } from '../models/Integration.js';
import { GenerationJob } from '../models/GenerationJob.js';
import { GeneratedProject } from '../models/GeneratedProject.js';

export const JOB_STEPS = [
  { key: 'validate', label: 'Validating application' },
  { key: 'analyze', label: 'Analyzing API' },
  { key: 'mcp', label: 'Generating MCP Server' },
  { key: 'ai-server', label: 'Generating AI Server' },
  { key: 'ai-chat', label: 'Preparing AI Chat component' },
  { key: 'docs', label: 'Generating Documentation' },
  { key: 'zip', label: 'Creating ZIP' },
];

function artifactsDir() {
  if (env.ARTIFACT_DIR) return env.ARTIFACT_DIR;
  return path.resolve(process.cwd(), '..', 'generated');
}

/**
 * Persists an Integration + GenerationJob and kicks off the background run.
 * The wizard polls GET /api/integrations/:id/status while it executes.
 */
export async function enqueueGeneration(draft) {
  const integration = await Integration.create({
    name: draft.name,
    appUrl: draft.appUrl,
    apiBaseUrl: draft.apiBaseUrl,
    authType: draft.auth.type,
    authConfig: {
      headerName: draft.auth.headerName,
      apiKeyHeader: draft.auth.apiKeyHeader,
      username: draft.auth.username,
      configured: true,
    },
    aiConfig: draft.ai,
    discovery: draft.discovery,
    endpoints: draft.endpoints,
    tools: draft.tools,
    status: 'generating',
  });

  const job = await GenerationJob.create({
    integrationId: integration._id.toString(),
    status: 'queued',
    steps: JOB_STEPS.map((s) => ({ label: s.label, status: 'pending' })),
  });

  await Integration.findByIdAndUpdate(integration._id, { jobId: job._id.toString() });

  // Fire and forget - progress is tracked in MongoDB, never in memory.
  runJob(job._id.toString()).catch((err) => {
    console.error(`[generation] job ${job._id} crashed:`, err);
  });

  return { integration: integration.toObject(), job: job.toObject() };
}

async function setStep(job, index, status, detail) {
  job.steps[index].status = status;
  if (detail) job.steps[index].detail = detail;
  job.currentStep = index;
  job.markModified('steps');
  await job.save();
}

async function setJobStatus(job, status, error) {
  job.status = status;
  if (error) job.error = error;
  await job.save();
}

async function runJob(jobId) {
  const job = await GenerationJob.findById(jobId);
  if (!job) return;
  await setJobStatus(job, 'running');

  const integration = await Integration.findById(job.integrationId);
  if (!integration) {
    await setJobStatus(job, 'failed', 'Integration no longer exists');
    return;
  }

  const config = {
    id: integration._id.toString(),
    name: integration.name,
    appUrl: integration.appUrl,
    apiBaseUrl: integration.apiBaseUrl,
    auth: {
      type: integration.authType,
      headerName: integration.authConfig?.headerName,
      apiKeyHeader: integration.authConfig?.apiKeyHeader,
      username: integration.authConfig?.username,
    },
    ai: integration.aiConfig,
    endpoints: integration.endpoints || [],
    tools: integration.tools || [],
    discovery: integration.discovery,
    artifactsDir: artifactsDir(),
  };

  try {
    await setStep(job, 0, 'running');
    const validation = await generator.validateApi(
      { apiBaseUrl: config.apiBaseUrl, auth: config.auth },
      { timeoutMs: env.REQUEST_TIMEOUT_MS }
    );
    await setStep(job, 0, 'completed', validation.latencyMs ? `Responded in ${validation.latencyMs}ms` : 'OK');

    await setStep(job, 1, 'running');
    const analysis = await generator.analyzeEndpoints(config.endpoints, {
      allowedPrivateHosts: [],
    });
    config.tools = analysis.tools;
    await setStep(job, 1, 'completed', `${analysis.tools.length} tool(s) mapped`);

    const result = await generator.generateProject(config);
    await setStep(job, 2, 'completed');
    await setStep(job, 3, 'completed');
    await setStep(job, 4, 'completed');
    await setStep(job, 5, 'completed');

    const { artifacts } = result;
    await GeneratedProject.findOneAndUpdate(
      { integrationId: integration._id.toString() },
      {
        integrationId: integration._id.toString(),
        jobId,
        projectName: result.projectName,
        version: result.version,
        status: 'ready',
        artifacts: { complete: artifacts.complete, parts: artifacts.parts },
      },
      { upsert: true, new: true }
    );

    await setStep(job, 6, 'completed', `${artifacts.complete.fileName} (${Math.round(artifacts.complete.sizeBytes / 1024)} KB)`);
    job.result = { projectName: result.projectName, artifacts: artifacts.complete.fileName };
    await setJobStatus(job, 'completed');
    await Integration.findByIdAndUpdate(integration._id, { status: 'ready' });
  } catch (err) {
    console.error('[generation]', err);
    const message = err instanceof Error ? err.message : String(err);
    await Integration.findByIdAndUpdate(integration._id, { status: 'failed' });
    await setStep(job, Math.max(job.currentStep, 0), 'failed', message);
    await setJobStatus(job, 'failed', message);
  }
}

/** Resolves the ZIP file on disk for a requested package, or null. */
export async function resolveArtifact(integrationId, packageKey) {
  const project = await GeneratedProject.findOne({ integrationId });
  if (!project || project.status !== 'ready') return null;

  const meta = packageKey === 'complete' ? project.artifacts.complete : project.artifacts.parts?.[packageKey];
  if (!meta?.fileName) return null;

  const filePath = path.join(artifactsDir(), meta.fileName);
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }
  return { filePath, fileName: meta.fileName, sizeBytes: meta.sizeBytes };
}

/** Removes zips, project directory and DB records for one integration. */
export async function deleteIntegration(integrationId, integration) {
  const project = await GeneratedProject.findOne({ integrationId });
  const dir = artifactsDir();
  const zipNames = [
    project?.artifacts?.complete?.fileName,
    project?.artifacts?.parts?.aiServer?.fileName,
    project?.artifacts?.parts?.mcpServer?.fileName,
    project?.artifacts?.parts?.aiChat?.fileName,
  ].filter(Boolean);

  await Promise.allSettled([
    ...zipNames.map((name) => fs.unlink(path.join(dir, name))),
    fs.rm(path.join(dir, integrationId), { recursive: true, force: true }),
    GeneratedProject.deleteOne({ integrationId }),
    GenerationJob.deleteMany({ integrationId }),
  ]);
  if (integration) await integration.deleteOne();
  return true;
}