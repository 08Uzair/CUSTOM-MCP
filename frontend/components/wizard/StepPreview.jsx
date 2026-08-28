'use client';

import { Boxes, Bot, Cpu, GitBranch, Loader2, Server, TerminalSquare } from 'lucide-react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useWizard } from './WizardContext';

/** Step 6 - review the complete plan before generating. */
export function StepPreview({ onAdvance, onBack }) {
  const { preview, runPreview, endpoints } = useWizard();
  const { status, result, error } = preview;

  return (
    <Card
      title="Integration preview"
      description="Everything the generator will create for your API."
      actions={
        <Button onClick={runPreview} disabled={status === 'loading'} variant={status === 'done' ? 'secondary' : 'primary'}>
          {status === 'loading' ? <><Loader2 size={15} className="animate-spin" /> Building preview...</> : 'Refresh preview'}
        </Button>
      }
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>Back</Button>
          <Button onClick={onAdvance} disabled={status !== 'done'}>Generate project</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {status === 'idle' && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
            <GitBranch size={16} aria-hidden="true" /> Review the tools, services, ports and environment contract before generation.
          </div>
        )}
        {status === 'error' && <Alert tone="error">{error}</Alert>}
        {status === 'done' && result && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { icon: Server, label: 'MCP Server', value: `:${result.ports.mcpServer}`, sub: `${result.tools.length} tools` },
                { icon: Bot, label: 'AI Server', value: `:${result.ports.aiServer}`, sub: result.ai.model },
                { icon: Boxes, label: 'AI Chat', value: 'copy & drop', sub: 'AiChat.jsx (react-markdown)' },
                { icon: Cpu, label: 'Provider', value: result.ai.provider, sub: result.ai.model },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <stat.icon size={14} aria-hidden="true" /> {stat.label}
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold text-gradient">{stat.value}</p>
                  <p className="text-[11px] text-slate-500">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400">
                <TerminalSquare size={13} aria-hidden="true" /> MCP tools ({result.tools.length} from {endpoints.length} endpoints)
              </div>
              <ul className="max-h-56 divide-y divide-slate-800 overflow-y-auto bg-slate-950/40">
                {result.tools.map((tool) => (
                  <li key={tool.name} className="flex items-start gap-3 px-3 py-2">
                    <code className="mt-0.5 shrink-0 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-300">{tool.name}</code>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-slate-400">{tool.description}</p>
                      <p className="font-mono text-[11px] text-slate-500">{tool.request.method} {tool.request.path}{tool.request.queryParams?.length ? `?${tool.request.queryParams.map((q) => q.name).join('&')}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-xs text-slate-400">
              <p className="font-medium text-slate-300">Environment contract - secrets stay out of the project</p>
              <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-slate-500">
                {result.auth.env.lines.map((line) => <li key={line}>{line}</li>)}
                <li>GROQ_API_KEY=</li>
                <li>GROQ_MODEL={result.ai.model}</li>
              </ul>
            </div>

            <p className="text-[11px] text-slate-500">
              Preview validates your configuration locally - generation is started on the next screen and runs on the generator backend.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}