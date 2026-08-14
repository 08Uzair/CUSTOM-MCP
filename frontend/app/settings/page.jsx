'use client';

import { Database, Globe, KeyRound, RefreshCw, Save, Server, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { NavBar } from '@/components/ui/NavBar';
import { apiFetch } from '@/lib/api';

const DEFAULTS = {
  apiUrl: 'http://localhost:4000',
  requestTimeout: 10000,
  pollInterval: 2000,
};

/**
 * Settings page - client-side preferences (persisted in localStorage) plus a
 * live backend health readout. No server-side account settings exist yet, by
 * design: authentication is future work.
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('aig.settings') || '{}');
      setSettings({ ...DEFAULTS, ...stored });
    } catch {
      /* corrupted storage - reset */
    }
    apiFetch('/api/health')
      .then((data) => setHealth({ ok: true, data }))
      .catch((err) => setHealth({ ok: false, message: err.message }));
  }, []);

  const save = () => {
    localStorage.setItem('aig.settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (patch) => setSettings((prev) => ({ ...prev, ...patch }));

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
          <p className="text-sm text-slate-500">Preferences are stored in your browser - no account required.</p>
        </div>

        <div className="space-y-5">
          <Card title="Backend connection" description="Where the browser reaches the generator API.">
            <Input
              label="API URL"
              value={settings.apiUrl}
              onChange={(e) => update({ apiUrl: e.target.value })}
              hint="Restart required after change - set NEXT_PUBLIC_API_URL in the frontend .env for permanent configuration."
            />
            <div className="mt-4 flex items-center gap-2">
              {health?.ok ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                    <ShieldCheck size={13} aria-hidden="true" /> Healthy
                  </span>
                  <span className="text-xs text-slate-500">
                    database: {health.data.database} · status: {health.data.status}
                  </span>
                </>
              ) : health ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30">
                  <Server size={13} aria-hidden="true" /> Unreachable - {health.message}
                </span>
              ) : (
                <span className="text-xs text-slate-500">Checking health…</span>
              )}
            </div>
          </Card>

          <Card title="Defaults" description="Values pre-filled when starting a new wizard run.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Request timeout (ms)"
                type="number"
                value={settings.requestTimeout}
                onChange={(e) => update({ requestTimeout: Number(e.target.value) })}
              />
              <Input
                label="Status poll interval (ms)"
                type="number"
                value={settings.pollInterval}
                onChange={(e) => update({ pollInterval: Number(e.target.value) })}
              />
            </div>
          </Card>

          <Card title="Security & data" description="How the platform handles your credentials.">
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <KeyRound size={15} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
                API keys and tokens are used transiently for connection tests and never persisted.
              </li>
              <li className="flex items-start gap-2">
                <Database size={15} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
                MongoDB stores only project metadata, endpoints and status.
              </li>
              <li className="flex items-start gap-2">
                <Globe size={15} className="mt-0.5 shrink-0 text-indigo-400" aria-hidden="true" />
                Generated projects never contain secrets - they ship .env.example placeholders.
              </li>
            </ul>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => window.location.reload()}><RefreshCw size={14} aria-hidden="true" /> Reset view</Button>
            <Button onClick={save}><Save size={14} aria-hidden="true" /> {saved ? 'Saved' : 'Save settings'}</Button>
          </div>
          {saved && <Alert tone="success">Settings saved to this browser.</Alert>}
        </div>
      </div>
    </div>
  );
}