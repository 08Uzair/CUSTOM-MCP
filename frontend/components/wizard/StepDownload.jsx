'use client';

import { Download, FileArchive, Package, Server, Smartphone, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { downloadFile } from '../../lib/api';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useWizard } from './WizardContext';
import { formatBytes } from '../../lib/validators';

/** Step 8 - download the complete project or individual services. */
export function StepDownload({ onReset }) {
  const { generation, draft } = useWizard();
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState(null);

  const slug = generation.project?.projectName || draft.name;

  const download = async (kind) => {
    setError(null);
    setDownloading(kind);
    try {
      await downloadFile(`/api/integrations/${generation.integrationId}/download?package=${kind}`, fileNameFor(kind));
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const fileNameFor = (kind) =>
    ({
      complete: `${slug}-complete.zip`,
      'ai-server': `${slug}-ai-server.zip`,
      'mcp-server': `${slug}-mcp-server.zip`,
      'ai-chat': `${slug}-ai-chat.zip`,
    })[kind] || `${slug}.zip`;

  const sizeOf = (kind) =>
    kind === 'complete'
      ? formatBytes(generation.project?.artifacts?.complete?.sizeBytes)
      : formatBytes(generation.project?.artifacts?.parts?.[kind]?.sizeBytes);

  const targets = [
    { kind: 'complete', icon: FileArchive, title: 'Complete project', sub: 'All services + docs + docker-compose', chip: 'from-indigo-500/25 to-indigo-500/5 text-indigo-300 ring-indigo-500/30' },
    { kind: 'mcp-server', icon: Server, title: 'MCP Server', sub: 'Tools for your API (port 5000)', chip: 'from-emerald-500/25 to-emerald-500/5 text-emerald-300 ring-emerald-500/30' },
    { kind: 'ai-server', icon: Package, title: 'AI Server', sub: 'Groq chat backend (port 4000)', chip: 'from-amber-500/25 to-amber-500/5 text-amber-300 ring-amber-500/30' },
    { kind: 'ai-chat', icon: Smartphone, title: 'AI Chat component', sub: 'AiChat.jsx - drop into your app', chip: 'from-sky-500/25 to-sky-500/5 text-sky-300 ring-sky-500/30' },
  ];

  return (
    <Card
      title="Download your integration"
      description={`${slug} is ready. Pick a package - no secrets included, each zip ships its own .env.example.`}
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2">
          {targets.map((target) => (
            <button
              key={target.kind}
              type="button"
              onClick={() => download(target.kind)}
              disabled={downloading !== null}
              className="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-indigo-500/50 disabled:opacity-50"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ${target.chip}`}>
                {downloading === target.kind ? <Download size={18} className="animate-pulse" /> : <target.icon size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{target.title}</span>
                <span className="block text-xs text-slate-500">{target.sub}</span>
                <span className="block font-mono text-[11px] text-slate-500">{fileNameFor(target.kind)}{sizeOf(target.kind) ? ` · ${sizeOf(target.kind)}` : ''}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/[0.07] px-4 py-3 text-xs text-indigo-200">
          <p className="flex items-center gap-1.5 font-medium text-indigo-300">
            <Sparkles size={13} aria-hidden="true" /> What's inside
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-indigo-200/80">
            <li>Full source code for both servers plus the AiChat.jsx component - plain JavaScript, fully commented.</li>
            <li>docker-compose.yml - run everything with <code className="rounded-md bg-white/10 px-1 font-mono">docker compose up</code></li>
            <li>Documentation: root README + one per service + ai-chat/INSTALL.md.</li>
            <li>.env.example files - create your .env from them and fill in your real keys.</li>
            <li>Your API details are already wired in - extraction is done, no hardcoding anywhere.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Generated artifacts are cleaned up automatically after 24h.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onReset}>Create another</Button>
            <a href={`/integrations/${generation.integrationId}`} className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700">
              View details
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}