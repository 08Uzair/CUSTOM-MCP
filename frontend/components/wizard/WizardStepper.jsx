'use client';

import { Check } from 'lucide-react';
import { STEPS, stepAccess, useWizard } from './WizardContext';

/**
 * Horizontal 7-step wizard progress: completed steps are checkmarked,
 * the active step is highlighted, locked steps are disabled.
 */
export function WizardStepper({ className = '' }) {
  const wizard = useWizard();
  const { step, goToStep } = wizard;
  const { canEnter } = stepAccess(wizard);

  return (
    <nav aria-label="Wizard progress" className={`w-full ${className}`}>
      <ol className="flex items-start gap-2">
        {STEPS.map((s, idx) => {
          const isActive = idx === step;
          const isDone = idx < step;
          const isLocked = !canEnter[idx];
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => !isLocked && goToStep(idx)}
                disabled={isLocked}
                aria-current={isActive ? 'step' : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 focus:outline-none ${
                  isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20'
                      : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-400 ring-1 ring-inset ring-slate-700'
                  }`}
                >
                  {isDone ? <Check size={15} aria-hidden="true" /> : idx + 1}
                </span>
                <span
                  className={`truncate text-center text-[11px] font-medium ${
                    isActive ? 'text-indigo-300' : isDone ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </button>
              {idx < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-full shrink-0 rounded-full ${isDone ? 'bg-emerald-500/60' : 'bg-slate-800'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}