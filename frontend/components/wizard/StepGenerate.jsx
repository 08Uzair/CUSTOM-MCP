'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { useWizard } from './WizardContext';

const GENERATION_STEPS = [
  'Validating application',
  'Analyzing API',
  'Generating MCP Server',
  'Generating AI Server',
  'Preparing AI Chat component',
  'Generating Documentation',
  'Creating ZIP',
];

/** Step 7 - runs the generation job with live progress tracking. */
export function StepGenerate({ onComplete }) {
  const { generation, startGeneration } = useWizard();

  useEffect(() => {
    if (generation.status === 'starting' || generation.status === 'running') return undefined;
    if (generation.status === 'idle') {
      startGeneration();
    }
    return undefined;
    // Intentionally runs once on mount - startGeneration is stable.
  }, []);

  const job = generation.job;
  const progress = job
    ? Math.round(((job.steps?.filter((s) => s.status === 'completed').length || 0) / GENERATION_STEPS.length) * 100)
    : 0;

  const statusIcon = (stepStatus) => {
    if (stepStatus === 'completed') return <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />;
    if (stepStatus === 'running') return <Loader2 size={16} className="shrink-0 animate-spin text-indigo-400" aria-hidden="true" />;
    if (stepStatus === 'failed') return <XCircle size={16} className="shrink-0 text-rose-400" aria-hidden="true" />;
    return <Circle size={15} className="shrink-0 text-slate-600" aria-hidden="true" />;
  };

  return (
    <Card title="Generating your integration" description="The generator builds all three services, documentation and ZIP packages.">
      <div className="space-y-5">
        {generation.status === 'error' && <Alert tone="error">{generation.error}</Alert>}

        {generation.status !== 'error' && (
          <>
            <ProgressBar value={progress} />
            <ol className="space-y-2.5">
              {(job?.steps || GENERATION_STEPS.map((label) => ({ label, status: 'pending' }))).map((stepItem, idx) => (
                <li key={stepItem.label} className="flex items-center gap-3">
                  {statusIcon(stepItem.status)}
                  <span
                    className={`text-sm ${
                      stepItem.status === 'completed'
                        ? 'text-slate-200'
                        : stepItem.status === 'running'
                          ? 'font-medium text-indigo-300'
                          : stepItem.status === 'failed'
                            ? 'text-rose-400'
                            : 'text-slate-500'
                    }`}
                  >
                    {stepItem.label}
                  </span>
                  {stepItem.detail && (
                    <span className="ml-auto truncate font-mono text-[11px] text-slate-500">{stepItem.detail}</span>
                  )}
                  {idx === (job?.currentStep ?? -1) && stepItem.status === 'running' && (
                    <span className="ml-auto text-[11px] text-indigo-400">running…</span>
                  )}
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {generation.status === 'done'
                  ? 'Generation completed - your project is ready to download.'
                  : 'This usually takes a few seconds. Keep this tab open.'}
              </p>
              {generation.status === 'done' && (
                <Button onClick={onComplete} variant="success">
                  Continue to download
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}