'use client';

import { Check } from 'lucide-react';
import { STEPS, stepAccess, useWizard } from './WizardContext';

/**
 * Horizontal 7-step wizard progress.
 *
 * Connector lines:
 * - Start at the right edge of the current circle
 * - End at the left edge of the next circle
 * - Never overlap the circles
 * - Completed connectors are green
 * - Future connectors are muted
 */
export function WizardStepper({ className = '' }) {
  const wizard = useWizard();
  const { step, goToStep } = wizard;
  const { canEnter } = stepAccess(wizard);

  return (
    <nav aria-label="Wizard progress" className={`w-full ${className}`}>
      <ol className="flex w-full items-start">
        {STEPS.map((s, idx) => {
          const isActive = idx === step;
          const isDone = idx < step;
          const isLocked = !canEnter[idx];
          const hasNext = idx < STEPS.length - 1;

          return (
            <li key={s.id} className="relative flex min-w-0 flex-1 justify-center">
              {/* Connector between this circle and the next circle */}
              {hasNext && (
                <span
                  aria-hidden="true"
                  className={`absolute top-4 left-[calc(50%+16px)] z-0 h-[2px] w-[calc(100%-32px)] -translate-y-1/2 rounded-full transition-colors duration-300 ${
                    isDone ? 'bg-emerald-500/70' : 'bg-slate-800'
                  }`}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  if (!isLocked) {
                    goToStep(idx);
                  }
                }}
                disabled={isLocked}
                aria-current={isActive ? 'step' : undefined}
                className={`relative z-10 flex min-w-0 flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                }`}
              >
                {/* Circle */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20'
                      : isDone
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-400 ring-1 ring-inset ring-slate-700'
                  }`}
                >
                  {isDone ? (
                    <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    idx + 1
                  )}
                </span>

                {/* Label */}
                <span
                  className={`whitespace-nowrap text-center text-[11px] font-medium transition-colors duration-300 ${
                    isActive
                      ? 'text-indigo-300'
                      : isDone
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
