'use client';

import { Globe, Link2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWizard } from './WizardContext';

/** Step 1 - application details: project name, app URL, API base URL. */
export function StepApplication({ onAdvance }) {
  const { draft, updateDraft } = useWizard();
  const canContinue = draft.name.trim().length > 1 && draft.apiBaseUrl.trim().length > 0;

  return (
    <Card
      title="Your application"
      description="Enter the application you want to give an AI integration."
      footer={
        <div className="flex justify-end">
          <Button onClick={onAdvance} disabled={!canContinue}>Continue</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Input
          label="Project name"
          placeholder="e.g. My API Assistant"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
          hint="Used to name the generated project and services."
        />
        <Input
          label="Application URL"
          placeholder="https://example.com"
          value={draft.appUrl}
          onChange={(e) => updateDraft({ appUrl: e.target.value })}
          error={draft.appUrl && !/^https?:\/\//i.test(draft.appUrl) ? 'Must start with http:// or https://' : undefined}
          hint={<span className="inline-flex items-center gap-1"><Globe size={12} aria-hidden="true" /> Hosted or local app: <code className="rounded-md border border-slate-700 bg-slate-800 px-1 font-mono text-indigo-300">http://localhost:3000</code></span>}
        />
        <Input
          label="API Base URL"
          placeholder="https://example.com/api"
          value={draft.apiBaseUrl}
          onChange={(e) => updateDraft({ apiBaseUrl: e.target.value })}
          error={draft.apiBaseUrl && !/^https?:\/\//i.test(draft.apiBaseUrl) ? 'Must be a valid http(s) URL' : undefined}
          hint={<span className="inline-flex items-center gap-1"><Link2 size={12} aria-hidden="true" /> Where your API endpoints live - everything generated starts from here.</span>}
        />
      </div>
    </Card>
  );
}