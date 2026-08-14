'use client';

import { FileUp, ClipboardPaste } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseRouteFile } from '../../lib/routeParser';
import { Button } from '../ui/Button';

/**
 * Import endpoints from a route/controller file or pasted text.
 * Parsed routes are passed to onImport for merging into the endpoint list.
 */
export function RouteFileImporter({ onImport }) {
  const [text, setText] = useState('');
  const [pasted, setPasted] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);

  const apply = (content) => {
    const parsed = parseRouteFile(content);
    if (!parsed.length) {
      setNotice({ tone: 'error', text: 'No routes detected - supported formats: router.get(\'/path\'), @app.post(\'/path\'), "GET /path" or bare "/path" lines.' });
      return;
    }
    setText(content);
    setNotice({ tone: 'success', text: `${parsed.length} route(s) parsed and added - you can edit or remove them in the table.` });
    onImport(parsed);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);
    try {
      apply(await file.text());
    } catch {
      setNotice({ tone: 'error', text: 'Could not read the selected file.' });
    } finally {
      e.target.value = '';
    }
  };

  const applyPasted = () => {
    if (!text.trim()) return;
    setNotice(null);
    apply(text);
  };

  const handleChange = (value) => {
    setText(value);
    if (notice) setNotice(null);
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-4">
      <p className="text-xs font-medium text-slate-300">
        Import routes from a file <span className="font-normal text-slate-500">(Express/Node routes, decorators, plain text)</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
        >
          <FileUp size={13} /> Upload route file
        </button>
        <input ref={fileRef} type="file" accept=".js,.ts,.jsx,.tsx,.mjs,.cjs,.txt,.json,.routes" className="hidden" onChange={handleFile} />
        {!pasted && (
          <button type="button" onClick={() => setPasted(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-indigo-400 transition hover:text-indigo-300">
            <ClipboardPaste size={13} /> or paste routes
          </button>
        )}
        {pasted && (
          <div className="w-full space-y-2">
            <textarea
              value={text}
              onChange={(e) => handleChange(e.target.value)}
              rows={5}
              spellCheck={false}
              placeholder={"router.get('/products', listProducts)\napp.post('/orders', createOrder)\nDELETE /cart/:id\n@router.put('/users/:id')"}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 font-mono text-xs text-slate-100 shadow-sm transition placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-label="Pasted routes"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={applyPasted} disabled={!text.trim()}>
                Parse &amp; add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPasted(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      {notice && (
        <p className={`mt-2 text-xs ${notice.tone === 'success' ? 'text-emerald-400' : 'text-rose-400'}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}
    </div>
  );
}
