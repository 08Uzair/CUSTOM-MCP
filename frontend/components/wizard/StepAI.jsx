'use client';

import { Bot, Cpu, Lock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWizard } from './WizardContext';

const FIXED_MODEL = 'openai/gpt-oss-120b';

/** Step 3 - AI provider settings. The model is FIXED (openai/gpt-oss-120b). */
export function StepAI({ onAdvance }) {
  const { draft } = useWizard();
  const ai = draft.ai;

  return (
    <Card
      title="AI Configuration"
      description="Which provider powers the generated chat assistant."
      footer={
        <div className="flex justify-end">
          <Button onClick={onAdvance} disabled={!ai.provider.trim()}>Continue</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300">Provider</label>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100">
            Groq <span className="text-slate-500">(fast inference, free tier available)</span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-300">Model</label>
          <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.07] px-3 py-2.5">
            <Lock size={14} className="shrink-0 text-indigo-400" aria-hidden="true" />
            <div>
              <p className="font-mono text-sm font-semibold text-indigo-300">{FIXED_MODEL}</p>
              <p className="text-[11px] text-slate-500">Fixed model - every generated project uses this model automatically.</p>
            </div>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Cpu size={12} aria-hidden="true" /> The generated code uses a provider abstraction - OpenAI, Anthropic, Gemini, Ollama and
          OpenRouter slots are ready in <code className="rounded-md border border-slate-700 bg-slate-800 px-1 font-mono text-indigo-300">ai-server/src/providers/ai-provider.js</code>.
        </p>

        <div className="flex items-start gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-xs text-slate-400">
          <Bot size={16} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
          <p>
            You will set your <code className="font-mono text-indigo-300">GROQ_API_KEY</code> in the generated <code className="font-mono text-indigo-300">ai-server/.env</code> file. The generator never asks for or
            stores your key.
          </p>
        </div>
      </div>
    </Card>
  );
}