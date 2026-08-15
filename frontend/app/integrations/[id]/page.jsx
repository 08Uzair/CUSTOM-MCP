'use client';

import { ArrowLeft, Boxes, CheckCircle2, Clock, Download, FileArchive, Loader2, Server, Trash2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, downloadFile } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { NavBar } from '@/components/ui/NavBar';
import { EndpointTable } from '@/components/integration/EndpointTable';
import { formatBytes, timeAgo } from '@/lib/validators';

export default function IntegrationDetailPage({ params }) {
  const id = params.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      apiFetch(`/api/integrations/${id}`)
        .then((d) => active && setData(d))
        .catch((err) => active && setError(err.message));
    load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);

  const download = async (kind) => {
    setDownloadError(null);
    setDownloading(kind);
    try {
      const slug = data?.project?.projectName || data?.integration?.name || 'project';
      await downloadFile(`/api/integrations/${id}/download?package=${kind}`, `${slug}-${kind === 'complete' ? 'complete' : kind}.zip`);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Alert tone="error">{error}</Alert>
          <div className="mt-4"><Link href="/dashboard"><Button variant="secondary">Back to dashboard</Button></Link></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-indigo-400" aria-hidden="true" /></div>
      </div>
    );
  }

  const { integration, job, project } = data;
  const jobSteps = job?.steps?.filter((s) => s.status === 'completed').length || 0;
  const jobTotal = job?.steps?.length || 7;

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700">
              <ArrowLeft size={13} aria-hidden="true" /> Dashboard
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{integration.name}</h1>
              <p className="font-mono text-xs text-slate-500">{integration.apiBaseUrl}</p>
            </div>
          </div>
          <Badge tone={integration.status === 'ready' ? 'emerald' : integration.status === 'generating' ? 'indigo' : integration.status === 'failed' ? 'rose' : 'slate'}>
            {integration.status}
          </Badge>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Endpoints discovered', value: integration.endpoints?.length || 0, icon: Server, tile: 'from-indigo-500/25 to-indigo-500/5 text-indigo-300 ring-indigo-500/30' },
              { label: 'MCP tools planned', value: integration.tools?.length || 0, icon: Boxes, tile: 'from-violet-500/25 to-violet-500/5 text-violet-300 ring-violet-500/30' },
              { label: 'Created', value: timeAgo(integration.createdAt), icon: Clock, tile: 'from-slate-500/25 to-slate-500/5 text-slate-300 ring-slate-500/30' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 shadow-xl shadow-black/30">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ring-inset ${stat.tile}`}><stat.icon size={16} aria-hidden="true" /></span>
                <div>
                  <p className="text-lg font-semibold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {job && (
            <Card title="Generation status" description={`Progress ${jobSteps}/${jobTotal}`}>
              <ol className="space-y-2">
                {job.steps.map((step) => (
                  <li key={step.label} className="flex items-center gap-3 text-sm">
                    {step.status === 'completed' && <CheckCircle2 size={15} className="text-emerald-400" aria-hidden="true" />}
                    {step.status === 'running' && <Loader2 size={15} className="animate-spin text-indigo-400" aria-hidden="true" />}
                    {step.status === 'failed' && <XCircle size={15} className="text-rose-400" aria-hidden="true" />}
                    {step.status === 'pending' && <span className="h-3.5 w-3.5 rounded-full border border-slate-600" aria-hidden="true" />}
                    <span className={step.status === 'failed' ? 'text-rose-400' : step.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {integration.endpoints?.length > 0 && (
            <Card title="Discovered endpoints" description={`Source: ${integration.discovery?.source || 'manual'}`}>
              <EndpointTable endpoints={integration.endpoints} />
            </Card>
          )}

          {project && (
            <Card
              title="Artifacts"
              description="Download the generated project - each ZIP contains only placeholder .env files."
              footer={downloadError && <Alert tone="error">{downloadError}</Alert>}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { kind: 'complete', label: 'Complete project', size: project.artifacts?.complete?.sizeBytes, icon: FileArchive },
                  { kind: 'mcp-server', label: 'MCP Server', size: project.artifacts?.parts?.mcpServer?.sizeBytes, icon: Server },
                  { kind: 'ai-server', label: 'AI Server', size: project.artifacts?.parts?.aiServer?.sizeBytes, icon: Boxes },
                  { kind: 'ai-chat', label: 'AI Chat component', size: project.artifacts?.parts?.aiChat?.sizeBytes, icon: Download },
                ].map((target) => (
                  <button
                    key={target.kind}
                    type="button"
                    onClick={() => download(target.kind)}
                    disabled={downloading !== null}
                    className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-indigo-500/50 disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/25 to-violet-500/5 text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                      {downloading === target.kind ? <Loader2 size={16} className="animate-spin" /> : <target.icon size={16} />}
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-white">{target.label}</span>
                      <span className="block font-mono text-[11px] text-slate-500">{formatBytes(target.size)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card title="Configuration" description="Stored metadata only - no secrets are ever persisted.">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['App URL', integration.appUrl || '—'],
                ['API base URL', integration.apiBaseUrl],
                ['Auth type', integration.authType],
                ['AI provider / model', `${integration.aiConfig?.provider} / ${integration.aiConfig?.model}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="font-mono text-xs text-slate-200">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Link href="/create"><Button size="sm" variant="secondary">New integration</Button></Link>
            <Button
              size="sm"
              variant="danger"
              onClick={async () => {
                if (!window.confirm('Delete this integration and all its generated artifacts?')) return;
                try {
                  await apiFetch(`/api/integrations/${id}`, { method: 'DELETE' });
                  window.location.href = '/dashboard';
                } catch (err) {
                  setDownloadError(err.message);
                }
              }}
            >
              <Trash2 size={13} aria-hidden="true" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}