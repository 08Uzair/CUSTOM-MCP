'use client';

import { CheckCircle2, ChevronDown, ChevronRight, FileJson, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { MethodPill } from '../integration/EndpointTable';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { BODY_METHODS, endpointKey, useWizard } from './WizardContext';

const FIELD_TYPES = ['string', 'number', 'boolean', 'object', 'array'];

function inferType(value) {
  if (value === null) return 'string';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Builds field rows from a parsed example payload.
 * Nested objects are flattened into dot-path rows (paymentInfo.id, ...) so
 * EVERY child lands in the table, not just the top-level parents:
 *   { "user": "...", "quantity": 2, "paymentInfo": { "id": "...", "status": "..." } }
 * -> user, quantity, paymentInfo, paymentInfo.id, paymentInfo.status
 */
function fieldsFromExample(example) {
  const rows = [];
  const walk = (value, prefix) => {
    if (Array.isArray(value)) {
      if (prefix) rows.push({ name: prefix, type: 'array', required: false, description: '' });
      const sample = value[0];
      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        for (const [key, child] of Object.entries(sample)) walk(child, `${prefix}.${key}`);
      }
      return;
    }
    if (value && typeof value === 'object') {
      if (prefix) rows.push({ name: prefix, type: 'object', required: false, description: '' });
      for (const [key, child] of Object.entries(value)) walk(child, prefix ? `${prefix}.${key}` : key);
      return;
    }
    rows.push({ name: prefix, type: inferType(value), required: false, description: '' });
  };
  walk(example, '');
  return rows;
}

const emptyPayload = { hasBody: true, fields: [], example: undefined };

/** Step 5 - define the request payload each endpoint needs. */
export function StepPayload({ onAdvance, onBack }) {
  const { endpoints, payloads, setPayloads, payloadReady } = useWizard();
  const [expanded, setExpanded] = useState(null);
  const [exampleText, setExampleText] = useState({});
  const [exampleError, setExampleError] = useState(null);

  const updatePayload = (ep, patch) => {
    setPayloads((prev) => ({
      ...prev,
      [endpointKey(ep)]: { ...emptyPayload, ...(prev[endpointKey(ep)] || {}), ...patch },
    }));
  };

  const updateField = (ep, idx, patch) => {
    const current = payloads[endpointKey(ep)] || emptyPayload;
    updatePayload(ep, {
      fields: (current.fields || []).map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    });
  };

  const removeField = (ep, idx) => {
    const current = payloads[endpointKey(ep)] || emptyPayload;
    updatePayload(ep, { fields: (current.fields || []).filter((_, i) => i !== idx) });
  };

  const addField = (ep) => {
    const current = payloads[endpointKey(ep)] || emptyPayload;
    updatePayload(ep, {
      fields: [...(current.fields || []), { name: '', type: 'string', required: false, description: '' }],
    });
  };

  const applyExample = (ep) => {
    const text = (exampleText[endpointKey(ep)] || '').trim();
    setExampleError(null);
    if (!text) return;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      setExampleError('Invalid JSON - fix the syntax before applying.');
      return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setExampleError('The example must be a JSON object, e.g. { "title": "Hello" }.');
      return;
    }
    const current = payloads[endpointKey(ep)] || emptyPayload;
    const existing = current.fields || [];
    const known = new Set(existing.map((f) => f.name));
    const fresh = fieldsFromExample(parsed).filter((f) => !known.has(f.name));
    updatePayload(ep, { example: parsed, fields: [...existing, ...fresh] });
  };

  const bodyEndpoints = endpoints.filter((ep) => BODY_METHODS.includes(ep.method.toUpperCase()));
  const missing = bodyEndpoints.filter((ep) => {
    const p = payloads[endpointKey(ep)];
    if (!p) return true;
    if (p.hasBody === false) return false;
    return !((p.fields?.length ?? 0) > 0 || p.example !== undefined);
  });
  const configuredCount = bodyEndpoints.length - missing.length;

  return (
    <Card
      title="Request Payloads"
      description="Tell the AI which payload each endpoint expects - it will build and validate requests exactly to this format."
      footer={
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {missing.length === 0
              ? `${bodyEndpoints.length} body endpoint(s) configured (${configuredCount} with a payload)`
              : `${missing.length} endpoint(s) still need a payload definition`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onBack}>Back</Button>
            <Button onClick={onAdvance} disabled={!payloadReady}>Continue</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {exampleError && <Alert tone="error">{exampleError}</Alert>}

        {endpoints.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-500">
            <TriangleAlert size={16} aria-hidden="true" /> No endpoints discovered yet - complete the API Discovery step first.
          </div>
        )}

        {endpoints.map((ep) => {
          const key = endpointKey(ep);
          const isBody = BODY_METHODS.includes(ep.method.toUpperCase());
          const payload = payloads[key] || emptyPayload;
          const isOpen = expanded === key;
          const isConfigured = !isBody || payload.hasBody === false || (payload.fields?.length ?? 0) > 0 || payload.example !== undefined;

          return (
            <div key={key} className="overflow-hidden rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : key)}
                className="flex w-full items-center gap-3 bg-slate-900/50 px-3 py-2.5 text-left transition hover:bg-slate-800/50"
                aria-expanded={isOpen}
              >
                {isOpen ? <ChevronDown size={15} className="shrink-0 text-slate-500" /> : <ChevronRight size={15} className="shrink-0 text-slate-500" />}
                <MethodPill method={ep.method} />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">{ep.path}</span>
                <span className="truncate text-xs text-slate-500">{ep.summary}</span>
                {isConfigured ? (
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" aria-hidden="true" />
                ) : (
                  <span className="shrink-0 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">payload needed</span>
                )}
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-slate-800 bg-slate-950/40 px-3 py-3">
                  {!isBody && (
                    <p className="text-xs text-slate-500">
                      {ep.method} requests carry no request body - path/query parameters are derived automatically from the endpoint.
                    </p>
                  )}

                  {isBody && (
                    <>
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={payload.hasBody !== false}
                          onChange={(e) => updatePayload(ep, { hasBody: e.target.checked, example: undefined })}
                          className="rounded border-slate-700 bg-slate-800 accent-indigo-500"
                        />
                        This endpoint expects a JSON request body
                      </label>

                      {payload.hasBody !== false && (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                              <FileJson size={13} aria-hidden="true" /> Example payload <span className="font-normal text-slate-600">(optional - paste JSON to auto-generate fields)</span>
                            </div>
                            <div className="flex gap-2">
                              <textarea
                                value={exampleText[key] || ''}
                                onChange={(e) => setExampleText((prev) => ({ ...prev, [key]: e.target.value }))}
                                rows={3}
                                placeholder='{ "title": "My post", "content": "Hello", "published": true }'
                                className="min-w-0 flex-1 resize-y rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                                aria-label={`Example payload for ${key}`}
                              />
                              <Button size="sm" variant="secondary" onClick={() => applyExample(ep)}>Apply</Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-400">Payload fields</span>
                              <Button size="sm" variant="secondary" onClick={() => addField(ep)}>
                                <Plus size={13} /> Add field
                              </Button>
                            </div>

                            {(payload.fields?.length ?? 0) === 0 ? (
                              <p className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-600">
                                No fields yet - add them below or paste an example JSON above.
                              </p>
                            ) : (
                              <div className="overflow-hidden rounded-lg border border-slate-800">
                                <div className="grid grid-cols-[1fr_90px_60px_1fr_28px] items-center gap-2 border-b border-slate-800 bg-slate-900/70 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                  <span>Field</span>
                                  <span>Type</span>
                                  <span>Required</span>
                                  <span>Description</span>
                                  <span />
                                </div>
                                {payload.fields.map((field, idx) => (
                                  <div key={idx} className="grid grid-cols-[1fr_90px_60px_1fr_28px] items-center gap-2 border-b border-slate-800 px-2 py-1.5 last:border-0">
                                    <input
                                      value={field.name}
                                      onChange={(e) => updateField(ep, idx, { name: e.target.value })}
                                      placeholder="fieldName"
                                      className="min-w-0 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                                      aria-label={`Field name ${idx + 1}`}
                                    />
                                    <select
                                      value={field.type}
                                      onChange={(e) => updateField(ep, idx, { type: e.target.value })}
                                      className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                                      aria-label={`Field type ${idx + 1}`}
                                    >
                                      {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                    <label className="flex items-center justify-center" title="Required field">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(field.required)}
                                        onChange={(e) => updateField(ep, idx, { required: e.target.checked })}
                                        className="rounded border-slate-700 bg-slate-800 accent-indigo-500"
                                        aria-label={`Required ${idx + 1}`}
                                      />
                                    </label>
                                    <input
                                      value={field.description || ''}
                                      onChange={(e) => updateField(ep, idx, { description: e.target.value })}
                                      placeholder="What is this field?"
                                      className="min-w-0 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                                      aria-label={`Field description ${idx + 1}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeField(ep, idx)}
                                      className="rounded p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                                      aria-label={`Remove field ${idx + 1}`}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}