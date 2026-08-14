'use client';

import { AlertTriangle, Boxes, CheckCircle2, Clock, Loader2, Server, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { NavBar } from '@/components/ui/NavBar';
import { formatBytes, timeAgo } from '@/lib/validators';

const STATUS_TONE = {
  draft: 'slate',
  generating: 'indigo',
  ready: 'emerald',
  failed: 'rose',
};

function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] || 'slate'}>{status}</Badge>;
}

function IntegrationCard({ integration }) {
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (integration.status === 'ready' || integration.status === 'generating' || integration.status === 'failed') {
      apiFetch(`/api/integrations/${integration._id}`)
        .then(setDetail)
        .catch(() => setDetail(null));
    }
  }, [integration._id, integration.status]);

  const remove = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/integrations/${integration._id}`, { method: 'DELETE' });
      window.location.reload();
    } finally {
      setDeleting(false);
    }
  };

  const project = detail?.project;
  const job = detail?.job;

  return (
    <Link href={`/integrations/${integration._id}`} className="group block rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/30 transition hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-indigo-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{integration.name}</h3>
          <p className="mt-0.5 truncate font-mono text-xs text-slate-500">{integration.apiBaseUrl}</p>
        </div>
        <StatusBadge status={integration.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Server size={13} aria-hidden="true" /> {integration.endpoints?.length || 0} endpoints</span>
        <span className="inline-flex items-center gap-1"><Boxes size={13} aria-hidden="true" /> {integration.tools?.length || 0} MCP tools</span>
        {project && <span className="inline-flex items-center gap-1 font-mono">{formatBytes(project.artifacts?.complete?.sizeBytes)}</span>}
        <span className="inline-flex items-center gap-1"><Clock size={13} aria-hidden="true" /> {timeAgo(integration.createdAt)}</span>
      </div>

      {job?.status === 'failed' && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <XCircle size={13} aria-hidden="true" /> {job.error}
        </p>
      )}
      {job?.status === 'running' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-indigo-400">
          <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Generating…
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
        <span className="text-[11px] text-slate-500">{integration.aiConfig?.provider} · {integration.aiConfig?.model}</span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(); }}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
        >
          <AlertTriangle size={12} aria-hidden="true" /> Delete
        </button>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [integrations, setIntegrations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    apiFetch('/api/integrations')
      .then((data) => active && setIntegrations(data))
      .catch((err) => active && setError(err.message));
    const timer = setInterval(() => {
      apiFetch('/api/integrations')
        .then((data) => active && setIntegrations(data))
        .catch(() => {});
    }, 8000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const readyCount = integrations?.filter((i) => i.status === 'ready').length || 0;
  const runningCount = integrations?.filter((i) => i.status === 'generating').length || 0;
  const failedCount = integrations?.filter((i) => i.status === 'failed').length || 0;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
            <p className="text-sm text-slate-500">Your generated AI integrations</p>
          </div>
          <Link href="/create">
            <Button size="lg">+ New integration</Button>
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Ready', value: readyCount, icon: CheckCircle2, tile: 'from-emerald-500/25 to-emerald-500/5 text-emerald-300 ring-emerald-500/30' },
            { label: 'Generating', value: runningCount, icon: Loader2, tile: 'from-indigo-500/25 to-indigo-500/5 text-indigo-300 ring-indigo-500/30' },
            { label: 'Failed', value: failedCount, icon: XCircle, tile: 'from-rose-500/25 to-rose-500/5 text-rose-300 ring-rose-500/30' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 shadow-xl shadow-black/30">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ${stat.tile}`}>
                <stat.icon size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300" role="alert">
            {error}
          </div>
        )}

        {integrations === null && !error && (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-indigo-400" aria-hidden="true" /></div>
        )}

        {integrations && integrations.length === 0 && (
          <Card className="py-12 text-center">
            <p className="text-4xl" aria-hidden="true">🪄</p>
            <h2 className="mt-3 text-base font-semibold text-white">No integrations yet</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Generate your first AI integration: enter an API, discover its endpoints, and download a complete project.
            </p>
            <div className="mt-5">
              <Link href="/create"><Button>Start the wizard</Button></Link>
            </div>
          </Card>
        )}

        {integrations && integrations.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <IntegrationCard key={integration._id} integration={integration} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}