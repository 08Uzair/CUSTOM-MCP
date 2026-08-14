'use client';

import { CheckCircle2, Loader2, PlugZap, Radio, XCircle } from 'lucide-react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';
import { EndpointTable } from '../integration/EndpointTable';
import { RouteFileImporter } from '../integration/RouteFileImporter';
import { useWizard } from './WizardContext';

const CHECK_META = {
  'Server reachable': 'serverReachable',
  'API reachable': 'apiReachable',
  'JSON detected': 'jsonDetected',
  'OpenAPI detected': 'openapiDetected',
};

/** Step 4 - "Test Connection": validate, inspect, discover, analyze. */
export function StepDiscovery({ onAdvance }) {
  const { discovery, endpoints, setEndpoints, runDiscovery } = useWizard();
  const { status, result, error } = discovery;

  const run = async () => {
    const outcome = await runDiscovery();
    if (outcome?.endpoints?.length) setEndpoints(outcome.endpoints);
  };

  const importEndpoints = (parsed) => {
    setEndpoints((prev) => {
      const seen = new Set(prev.map((e) => `${e.method.toUpperCase()} ${e.path}`));
      const fresh = parsed.filter((e) => !seen.has(`${e.method.toUpperCase()} ${e.path}`));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  const checks = result?.checks?.map((c) => ({
    label: c.label,
    status: c.status,
    message: c.message,
    ok: c.status === 'ok',
    mapped: CHECK_META[c.label],
  })) || [];

  return (
    <Card
      title="API Discovery"
      description="Test the connection and let the generator inspect your API."
      actions={
        <Button onClick={run} disabled={status === 'loading'} variant={status === 'done' ? 'secondary' : 'primary'}>
          {status === 'loading' ? <><Spinner size={14} /> Testing...</> : <><PlugZap size={15} /> Test Connection</>}
        </Button>
      }
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {status === 'done' && result ? `${endpoints.length} endpoint(s) configured (${result.source || 'manual'} source)` : 'Discovery is required before continuing.'}
          </span>
          <Button onClick={onAdvance} disabled={!endpoints.length}>
            Continue
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {status === 'idle' && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
            <Radio size={16} aria-hidden="true" />
            Run a connection test to validate the server, detect JSON and search for an OpenAPI specification.
          </div>
        )}

        {status === 'loading' && (
          <div className="flex items-center gap-3 rounded-xl border border-indigo-500/25 bg-indigo-500/[0.07] px-4 py-4 text-sm text-indigo-200">
            <Loader2 size={16} className="animate-spin text-indigo-400" aria-hidden="true" />
            <div>
              <p className="font-medium">Checking {result?.url || ''}</p>
              <p className="text-xs text-indigo-300">Validating server → reaching endpoint → detecting JSON → searching for OpenAPI…</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <Alert tone="error">
            <p className="font-medium">Discovery failed</p>
            <p className="mt-1 text-sm opacity-90">{error}</p>
          </Alert>
        )}

        {status === 'done' && result && (
          <>
            <ul className="grid gap-2 sm:grid-cols-2">
              {checks.map((check) => (
                <li key={check.label} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
                  {check.ok ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <XCircle size={16} className="shrink-0 text-amber-400" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200">{check.label}</p>
                    <p className="truncate text-[11px] text-slate-500">{check.message}</p>
                  </div>
                </li>
              ))}
            </ul>
            {result.openapiUrl && (
              <p className="text-xs text-slate-500">
                OpenAPI spec: <code className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">{result.openapiUrl}</code>
              </p>
            )}
            <EndpointTable endpoints={endpoints} onChange={setEndpoints} editable={result.source === 'manual' || result.endpoints?.length === 0} />
            <RouteFileImporter onImport={importEndpoints} />
          </>
        )}
      </div>
    </Card>
  );
}