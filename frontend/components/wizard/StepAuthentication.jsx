'use client';

import { KeyRound, ShieldCheck } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWizard } from './WizardContext';
import { validateAuthStep } from '../../lib/validators';

const AUTH_TYPES = [
  { value: 'none', label: 'No authentication' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'custom-header', label: 'Custom Header' },
  { value: 'basic', label: 'Basic Authentication' },
];

/** Step 2 - how clients authenticate against the target API. */
export function StepAuthentication({ onAdvance }) {
  const { draft, updateAuth } = useWizard();
  const auth = draft.auth;

  const field = {
    none: null,
    bearer: <Input label="Bearer token" type="password" placeholder="tok_... or JWT" value={auth.token} onChange={(e) => updateAuth({ token: e.target.value })} hint="Used transiently for the connection test - never stored by the generator." autoComplete="off" />,
    'api-key': (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="API key header" placeholder="x-api-key" value={auth.apiKeyHeader} onChange={(e) => updateAuth({ apiKeyHeader: e.target.value })} />
        <Input label="API key" type="password" placeholder="Your secret key" value={auth.token} onChange={(e) => updateAuth({ token: e.target.value })} autoComplete="off" />
      </div>
    ),
    'custom-header': (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Header name" placeholder="x-auth-token" value={auth.headerName} onChange={(e) => updateAuth({ headerName: e.target.value })} />
        <Input label="Header value" type="password" placeholder="Static header value" value={auth.headerValue} onChange={(e) => updateAuth({ headerValue: e.target.value })} autoComplete="off" />
      </div>
    ),
    basic: (
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Username" value={auth.username} onChange={(e) => updateAuth({ username: e.target.value })} autoComplete="off" />
        <Input label="Password" type="password" value={auth.basicPassword} onChange={(e) => updateAuth({ basicPassword: e.target.value })} autoComplete="off" />
      </div>
    ),
  };

  const valid = validateAuthStep(auth);

  return (
    <Card
      title="Authentication"
      description="How the generated MCP server should authenticate to your API."
      footer={
        <div className="flex justify-end">
          <Button onClick={onAdvance} disabled={!valid}>Continue</Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Select label="Authentication method" options={AUTH_TYPES} value={auth.type} onChange={(e) => updateAuth({ type: e.target.value })} />

        {field[auth.type]}

        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5 text-xs text-emerald-200">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
          <p>
            Credentials are never stored by the generator and never appear in the exported project. You provide values here for the live
            connection test; the generated <code className="font-mono text-indigo-300">.env.example</code> only contains placeholders you fill locally.
          </p>
        </div>

        {auth.type !== 'none' && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <KeyRound size={12} aria-hidden="true" /> The generated <code className="font-mono text-slate-300">mcp-server/.env.example</code> will expect:{' '}
            <code className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-indigo-300">
              {auth.type === 'bearer' && 'TARGET_API_TOKEN'}
              {auth.type === 'api-key' && `TARGET_API_API_KEY (via ${auth.apiKeyHeader || 'x-api-key'})`}
              {auth.type === 'custom-header' && `TARGET_API_AUTH_HEADER_VALUE (via ${auth.headerName || 'x-auth-token'})`}
              {auth.type === 'basic' && 'TARGET_API_BASIC_USERNAME / TARGET_API_BASIC_PASSWORD'}
            </code>
          </p>
        )}
      </div>
    </Card>
  );
}