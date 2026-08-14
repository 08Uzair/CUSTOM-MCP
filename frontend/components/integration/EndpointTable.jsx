'use client';

import { Check, CheckCircle2, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Shows discovered endpoints with optional editing (used when no OpenAPI
 * document was found, so the developer can supply endpoints manually).
 */
export function EndpointTable({ endpoints, onChange, editable = false }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ method: 'GET', path: '/', summary: '' });
  const [editing, setEditing] = useState(null);

  const addEndpoint = () => {
    if (!draft.path.trim()) return;
    onChange([...endpoints, { method: draft.method, path: draft.path.replace(/^\/?/, '/'), summary: draft.summary || `Custom ${draft.method} endpoint`, source: 'manual' }]);
    setDraft({ method: 'GET', path: '/', summary: '' });
    setAdding(false);
  };

  const removeEndpoint = (idx) => onChange(endpoints.filter((_, i) => i !== idx));

  const saveEdit = () => {
    if (!editing || !editing.path.trim()) return;
    onChange(
      endpoints.map((ep, i) =>
        i === editing.idx
          ? { ...ep, method: editing.method, path: editing.path.replace(/^\/?/, '/'), summary: editing.summary.trim() || ep.summary }
          : ep
      )
    );
    setEditing(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Method</th>
            <th scope="col" className="px-3 py-2 font-medium">Path</th>
            <th scope="col" className="px-3 py-2 font-medium">Summary</th>
            <th scope="col" className="px-3 py-2 font-medium">Source</th>
            {editable && <th scope="col" className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {endpoints.length === 0 && (
            <tr>
              <td colSpan={editable ? 5 : 4} className="px-3 py-6 text-center text-xs text-slate-500">
                No endpoints yet - add one below, import a route file, or try a different URL.
              </td>
            </tr>
          )}
          {endpoints.map((ep, idx) => {
            const isEditing = editing?.idx === idx;
            return (
              <tr key={`${ep.method}-${ep.path}-${idx}`} className="bg-slate-900/40 transition hover:bg-slate-800/50">
                {isEditing ? (
                  <>
                    <td className="px-3 py-2">
                      <select
                        value={editing.method}
                        onChange={(e) => setEditing({ ...editing, method: e.target.value })}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs text-slate-200"
                        aria-label="Method"
                      >
                        {METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editing.path}
                        onChange={(e) => setEditing({ ...editing, path: e.target.value })}
                        className="w-full min-w-32 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs text-slate-200"
                        aria-label="Endpoint path"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={editing.summary}
                        onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                        className="w-full min-w-32 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
                        aria-label="Summary"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{ep.source}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={saveEdit} aria-label="Save endpoint" className="rounded p-1 text-emerald-400 transition hover:bg-emerald-500/10">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={() => setEditing(null)} aria-label="Cancel editing" className="rounded p-1 text-slate-500 transition hover:bg-slate-700 hover:text-white">
                        <X size={14} />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2">
                      <MethodPill method={ep.method} />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-300">{ep.path}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{ep.summary}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{ep.source}</td>
                    {editable && (
                      <td className="px-3 py-2 text-right">
                        <button type="button" onClick={() => setEditing({ idx, method: ep.method, path: ep.path, summary: ep.summary || '' })} aria-label={`Edit ${ep.method} ${ep.path}`} className="rounded p-1 text-slate-500 transition hover:bg-indigo-500/10 hover:text-indigo-400">
                          <Pencil size={14} />
                        </button>
                        <button type="button" onClick={() => removeEndpoint(idx)} aria-label={`Remove ${ep.method} ${ep.path}`} className="rounded p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {editable && (
        <div className="border-t border-slate-800 bg-slate-900/60 px-3 py-2.5">
          {adding ? (
            <div className="flex flex-wrap items-center gap-2">
              <select value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs text-slate-200" aria-label="Method">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <input
                value={draft.path}
                onChange={(e) => setDraft({ ...draft, path: e.target.value })}
                placeholder="/users/:id"
                className="min-w-40 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-500"
                aria-label="Endpoint path"
              />
              <input
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                placeholder="Summary (optional)"
                className="min-w-40 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500"
                aria-label="Summary"
              />
              <button type="button" onClick={addEndpoint} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-500/25 hover:brightness-110">
                <Plus size={13} /> Add
              </button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white">
                <Plus size={13} /> Add endpoint
              </button>
              <span className="text-[11px] text-slate-600">No OpenAPI found? Add or import endpoints manually</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MethodPill({ method }) {
  return (
    <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset ${methodColor(method)}`}>{method}</span>
  );
}

export function methodColor(method) {
  switch (method) {
    case 'GET': return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30';
    case 'POST': return 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30';
    case 'PUT':
    case 'PATCH': return 'bg-amber-500/15 text-amber-300 ring-amber-500/30';
    case 'DELETE': return 'bg-rose-500/15 text-rose-300 ring-rose-500/30';
    default: return 'bg-slate-800 text-slate-400 ring-slate-700';
  }
}

export function EndpointTableLoading() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 py-8 text-sm text-slate-400">
      <Loader2 size={15} className="animate-spin text-indigo-400" /> Analyzing endpoints...
    </div>
  );
}

export function EndpointTableEmpty() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 py-8 text-sm text-slate-500">
      <CheckCircle2 size={15} className="text-emerald-400" /> No endpoints found yet - try a different URL.
    </div>
  );
}
