'use client';

import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { WizardProvider, useWizard, stepAccess, STEP_IDS } from '@/components/wizard/WizardContext';
import { WizardStepper } from '@/components/wizard/WizardStepper';
import { StepApplication } from '@/components/wizard/StepApplication';
import { StepAuthentication } from '@/components/wizard/StepAuthentication';
import { StepAI } from '@/components/wizard/StepAI';
import { StepDiscovery } from '@/components/wizard/StepDiscovery';
import { StepPayload } from '@/components/wizard/StepPayload';
import { StepPreview } from '@/components/wizard/StepPreview';
import { StepGenerate } from '@/components/wizard/StepGenerate';
import { StepDownload } from '@/components/wizard/StepDownload';

const STEPS_COMPONENTS = [StepApplication, StepAuthentication, StepAI, StepDiscovery, StepPayload, StepPreview, StepGenerate, StepDownload];

function WizardBody() {
  const wizard = useWizard();
  const { step, goToStep, reset } = wizard;
  const { canEnter } = stepAccess(wizard);
  const ActiveStep = STEPS_COMPONENTS[step];
  const lastStep = STEP_IDS.length - 1;
  const nextLocked = step < lastStep && !canEnter[step + 1];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                <Zap size={16} aria-hidden="true" />
              </span>
              AI Integration <span className="text-gradient">Generator</span>
            </Link>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(step - 1)}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
                >
                  <ChevronLeft size={14} aria-hidden="true" /> Back
                </button>
              )}
              <Link href="/dashboard" className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4">
        <div className="py-6">
          <WizardStepper />
        </div>
        <main className="pb-16">
          <ActiveStep
            onAdvance={() => step < lastStep && goToStep(step + 1)}
            onBack={() => goToStep(step - 1)}
            onComplete={() => goToStep(lastStep)}
            onReset={reset}
          />
        </main>
        {!nextLocked && step < lastStep && (
          <div className="pb-10 text-center">
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              className="hidden items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-indigo-400 transition hover:bg-slate-800/70 sm:inline-flex"
            >
              Skip to next step <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <WizardProvider>
      <WizardBody />
    </WizardProvider>
  );
}