import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * AiChat - a self-contained AI chat component you can drop into ANY React
 * app (Next.js, Vite, CRA, ...).
 *
 * Zero extra dependencies: no UI library, no icon library, no Tailwind -
 * it ships its own scoped CSS and inline SVG icons.
 *
 * It talks to the generated ai-server over SSE (/api/chat) which in turn
 * calls the generated mcp-server, which calls YOUR application API:
 *
 *   <AiChat />  ->  ai-server (Groq + tool calling)  ->  mcp-server  ->  your API
 *
 * User ID:
 *   - The component reads the user id from localStorage (key: `userId`
 *     by default, also falls back to `userID` / `user_id` / `userid`).
 *   - If no id exists yet, one is generated automatically and persisted.
 *   - It is sent with EVERY chat request and the ai-server injects it into
 *     tool payloads wherever a tool schema requires a user id.
 *   - Click the user chip in the header to change the id (persisted).
 *
 * Props:
 *   apiUrl       AI server base URL (default: the generated port)
 *   projectName  Title shown in the header
 *   subtitle     Small text under the title
 *   userIdKey    localStorage key for the user id (default 'userId')
 *   onUserIdChange(userId)  optional callback when the id changes
 */

const DEFAULT_API_URL = 'http://localhost:{{PORT_AI_SERVER}}';

const SUGGESTIONS = [
  'List the data available in the system',
  'What can you help me with?',
  'Show me the endpoints of this API',
];

const USER_ID_KEYS = ['userId', 'userID', 'user_id', 'userid'];

// ============================================================
// Scoped styles (injected once into <head>)
// ============================================================

const STYLES = `
.aic-wrap{display:flex;flex-direction:column;height:100%;min-height:480px;background:linear-gradient(180deg,#f8fafc,#eef2ff);color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5}
.aic-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:rgba(255,255,255,.85);border-bottom:1px solid #e2e8f0;backdrop-filter:blur(8px)}
.aic-header-left{display:flex;align-items:center;gap:12px;min-width:0}
.aic-logo{display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 4px 12px rgba(99,102,241,.35)}
.aic-title{font-size:14px;font-weight:600;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aic-subtitle{font-size:12px;color:#64748b;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aic-header-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
.aic-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:500;white-space:nowrap}
.aic-pill-dot{width:7px;height:7px;border-radius:50%}
.aic-pill-check{background:#ecfdf5;color:#059669}
.aic-pill-check .aic-pill-dot{background:#10b981}
.aic-pill-warn{background:#fffbeb;color:#d97706}
.aic-pill-warn .aic-pill-dot{background:#f59e0b}
.aic-pill-idle{background:#f1f5f9;color:#94a3b8}
.aic-pill-idle .aic-pill-dot{background:#cbd5e1;animation:aicPulse 1.2s ease-in-out infinite}
@keyframes aicPulse{0%,100%{opacity:1}50%{opacity:.4}}
.aic-user-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;border:1px solid #e2e8f0;background:#fff;font-size:11px;color:#475569;cursor:pointer;transition:border-color .15s}
.aic-user-chip:hover{border-color:#6366f1}
.aic-user-chip b{font-weight:600;color:#0f172a}
.aic-icon-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#64748b;cursor:pointer;transition:background .15s,color .15s}
.aic-icon-btn:hover{background:#f1f5f9;color:#0f172a}
.aic-icon-btn:disabled{opacity:.4;cursor:not-allowed}
.aic-body{flex:1;overflow-y:auto;padding:20px 16px}
.aic-scroll{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.aic-empty{max-width:440px;margin:40px auto 0;text-align:center}
.aic-empty-logo{display:flex;align-items:center;justify-content:center;width:64px;height:64px;margin:0 auto 16px;border-radius:22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 12px 24px rgba(99,102,241,.4)}
.aic-empty h2{font-size:17px;font-weight:600;margin:0 0 8px}
.aic-empty p{font-size:13px;color:#64748b;margin:0}
.aic-suggestions{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:20px}
.aic-suggestion{width:100%;max-width:400px;padding:10px 14px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;text-align:left;font-size:13px;color:#475569;cursor:pointer;transition:all .15s}
.aic-suggestion:hover{border-color:#a5b4fc;background:#eef2ff;color:#4338ca}
.aic-suggestion:disabled{opacity:.5;cursor:not-allowed}
.aic-msg-row{display:flex;gap:12px;width:100%}
.aic-msg-user{justify-content:flex-end}
.aic-avatar{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;border-radius:12px;color:#fff;margin-top:4px}
.aic-avatar-bot{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 10px rgba(99,102,241,.3)}
.aic-avatar-user{background:#334155}
.aic-msg-col{display:flex;flex-direction:column;max-width:82%}
.aic-msg-user .aic-msg-col{align-items:flex-end}
.aic-bubble{padding:10px 14px;border-radius:16px;font-size:13px;box-shadow:0 1px 2px rgba(15,23,42,.05);white-space:pre-wrap;overflow-wrap:break-word}
.aic-bubble-user{background:#6366f1;color:#fff;border-bottom-right-radius:6px}
.aic-bubble-bot{background:#fff;color:#0f172a;border:1px solid #f1f5f9;border-bottom-left-radius:6px}
.aic-cursor{display:inline-block;width:2px;height:14px;margin-left:2px;border-radius:2px;background:currentColor;animation:aicBlink 1s steps(2) infinite;vertical-align:middle}
@keyframes aicBlink{0%,100%{opacity:1}50%{opacity:0}}
.aic-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.aic-tool{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:500}
.aic-tool-run{background:#eef2ff;color:#4f46e5}
.aic-tool-ok{background:#ecfdf5;color:#059669}
.aic-tool-err{background:#fef2f2;color:#e11d48}
.aic-meta{display:flex;align-items:center;gap:8px;margin-top:4px;padding:0 4px}
.aic-time{font-size:10px;color:#94a3b8}
.aic-copy{display:flex;align-items:center;justify-content:center;width:20px;height:20px;border:none;background:none;color:#cbd5e1;cursor:pointer;opacity:0;transition:opacity .15s,color .15s}
.aic-msg-row:hover .aic-copy{opacity:1}
.aic-copy:hover{color:#6366f1}
.aic-thinking{display:flex;align-items:center;gap:12px}
.aic-thinking .aic-bubble{display:flex;align-items:center;gap:8px;color:#64748b;font-size:13px}
.aic-spin{animation:aicSpin 1s linear infinite}
@keyframes aicSpin{to{transform:rotate(360deg)}}
.aic-error{display:flex;align-items:flex-start;gap:10px;max-width:440px;margin:0 auto;padding:12px 14px;border-radius:16px;border:1px solid #fecaca;background:#fef2f2}
.aic-error p{margin:0;font-size:12px;color:#be123c}
.aic-error b{display:block;font-size:13px;margin-bottom:2px}
.aic-retry{flex-shrink:0;padding:6px 12px;border:none;border-radius:10px;background:#e11d48;color:#fff;font-size:12px;font-weight:500;cursor:pointer;transition:background .15s}
.aic-retry:hover{background:#be123c}
.aic-note{display:flex;align-items:center;gap:8px;max-width:440px;margin:0 auto;padding:9px 14px;border-radius:12px;border:1px solid #fde68a;background:#fffbeb;font-size:12px;color:#92400e}
.aic-footer{padding:14px 16px;border-top:1px solid #e2e8f0;background:rgba(255,255,255,.85);backdrop-filter:blur(8px)}
.aic-input-area{max-width:720px;margin:0 auto}
.aic-input-row{display:flex;align-items:flex-end;gap:8px;padding:8px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 4px 16px rgba(15,23,42,.06);transition:border-color .15s,box-shadow .15s}
.aic-input-row:focus-within{border-color:#818cf8;box-shadow:0 0 0 4px rgba(99,102,241,.12)}
.aic-textarea{flex:1;min-height:44px;max-height:160px;padding:10px 12px;border:none;outline:none;background:transparent;resize:none;font-family:inherit;font-size:13px;color:#0f172a}
.aic-textarea::placeholder{color:#94a3b8}
.aic-send{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0;border:none;border-radius:12px;background:#6366f1;color:#fff;cursor:pointer;transition:background .15s,transform .1s}
.aic-send:hover{background:#4f46e5}
.aic-send:active{transform:scale(.95)}
.aic-send:disabled{opacity:.5;cursor:not-allowed}
.aic-stop{background:#f43f5e}
.aic-stop:hover{background:#e11d48}
.aic-hint{text-align:center;font-size:11px;color:#94a3b8;margin:8px 0 0}
@media (prefers-color-scheme: dark){
.aic-wrap{background:linear-gradient(180deg,#020617,#0f172a);color:#f1f5f9}
.aic-header{background:rgba(15,23,42,.85);border-color:#1e293b}
.aic-subtitle{color:#94a3b8}
.aic-icon-btn{background:#0f172a;border-color:#334155;color:#94a3b8}
.aic-icon-btn:hover{background:#1e293b;color:#f1f5f9}
.aic-pill-check{background:rgba(16,185,129,.15);color:#34d399}
.aic-pill-warn{background:rgba(245,158,11,.15);color:#fbbf24}
.aic-pill-idle{background:#1e293b;color:#64748b}
.aic-pill-idle .aic-pill-dot{background:#475569}
.aic-user-chip{border-color:#334155;background:#0f172a;color:#94a3b8}
.aic-user-chip b{color:#f1f5f9}
.aic-bubble-bot{background:#1e293b;color:#f1f5f9;border-color:#334155}
.aic-empty p{color:#94a3b8}
.aic-suggestion{border-color:#334155;background:#0f172a;color:#94a3b8}
.aic-suggestion:hover{border-color:#6366f1;background:#1e1b4b;color:#a5b4fc}
.aic-time{color:#475569}
.aic-copy{color:#475569}
.aic-tool-run{background:rgba(99,102,241,.15);color:#a5b4fc}
.aic-tool-ok{background:rgba(16,185,129,.15);color:#34d399}
.aic-tool-err{background:rgba(244,63,94,.15);color:#fb7185}
.aic-footer{background:rgba(15,23,42,.85);border-color:#1e293b}
.aic-input-row{border-color:#334155;background:#0f172a}
.aic-textarea{color:#f1f5f9}
.aic-hint{color:#64748b}
.aic-error{border-color:#7f1d1d;background:#450a0a}
.aic-error p{color:#fda4af}
.aic-note{border-color:#78350f;background:#451a03;color:#fbbf24}
}
@media (max-width:560px){
.aic-subtitle{display:none}
.aic-user-chip{display:none}
}
`;

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-aichat', 'true');
  style.textContent = STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ============================================================
// Icons (inline SVG - no icon library needed)
// ============================================================

function Icon({ d, size = 16, spin = false, fill = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spin ? 'aic-spin' : undefined}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  send: 'M22 2 11 13',
  send2: 'M22 2 15 22l-4-9-9-4Z',
  stop: 'M5 5h14v14H5z',
  bot: 'M12 8V4M8 4h8M4 20h16M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm5 5h.01M15 13h.01',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  check: 'M20 6 9 17l-5-5',
  refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
  eraser: 'M7 21h10M4 17 12 4l8 13-6 3-4-7M16 14h.01',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  wrench: 'M14.7 6.3a4.5 4.5 0 0 0 6 6L13 20a2 2 0 0 1-3-3l7.7-7.7a4.5 4.5 0 0 0-6-6L8 6.7',
  sparkles: 'm12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z',
  server: 'M4 6h16M4 12h16M4 18h16M7 3h.01M7 9h.01M7 15h.01',
};

// ============================================================
// SSE parsing (browser fetch ReadableStream)
// ============================================================

async function readSseStream(response, onEvent, signal) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const abort = () => reader.cancel();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseEvent(rawEvent);
        if (parsed) onEvent(parsed);
      }
    }
  } finally {
    signal?.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}

function parseEvent(raw) {
  let event = 'message';
  const dataLines = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

// ============================================================
// API helpers
// ============================================================

async function streamChat(apiUrl, messages, userId, signal) {
  const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, userId }),
    signal,
  });

  if (!response.ok) {
    let message = `AI server responded with HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body?.error?.message || message;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  return response;
}

async function checkServerHealth(apiUrl) {
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================
// User ID helpers (localStorage)
// ============================================================

function readStoredUserId(key) {
  try {
    for (const candidate of [key, ...USER_ID_KEYS]) {
      const value = localStorage.getItem(candidate);
      if (value && value.trim()) return value.trim();
    }
  } catch {
    /* storage unavailable */
  }
  return '';
}

function generateUserId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function persistUserId(key, id) {
  try {
    localStorage.setItem(key, id);
  } catch {
    /* storage unavailable */
  }
}

// ============================================================
// Chat state machine
// ============================================================

function useChat(apiUrl, userId) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [toolEvents, setToolEvents] = useState([]);
  const [serverUp, setServerUp] = useState(null);
  const [lastError, setLastError] = useState(null);
  const abortRef = useRef(null);
  const lastMessagesRef = useRef([]);

  useEffect(() => {
    checkServerHealth(apiUrl).then((up) => setServerUp(up));
  }, [apiUrl]);

  const send = useCallback(
    async (text) => {
      if (!text.trim() || status === 'streaming') return;
      abortRef.current?.abort();

      const userMessage = {
        role: 'user',
        content: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      lastMessagesRef.current = [...lastMessagesRef.current, userMessage];
      const history = [...lastMessagesRef.current];
      setMessages(history);
      setStatus('thinking');
      setToolEvents([]);
      setLastError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await streamChat(apiUrl, history, userId, controller.signal);
        const assistantText = [];

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '',
            streaming: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        await readSseStream(
          response,
          ({ event, data }) => {
            let payload = {};
            try {
              payload = data ? JSON.parse(data) : {};
            } catch {
              /* ignore malformed frames */
            }

            switch (event) {
              case 'status':
                if (payload.message) setStatus((s) => (s === 'error' ? s : 'thinking'));
                break;
              case 'tool_call':
                setToolEvents((prev) => [
                  ...prev,
                  { name: payload.name, status: 'running', args: payload.args },
                ]);
                break;
              case 'tool_result':
                setToolEvents((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.name === payload.name) {
                    last.status = payload.success ? 'ok' : 'error';
                    last.summary = payload.summary;
                  }
                  return next;
                });
                break;
              case 'delta':
                assistantText.push(payload.text || '');
                setStatus('streaming');
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last && last.role === 'assistant' && last.streaming) {
                    last.content = assistantText.join('');
                  }
                  return next;
                });
                break;
              case 'error':
                throw new Error(payload.message || 'AI server stream error');
              case 'done':
                break;
              default:
                break;
            }
          },
          controller.signal
        );

        const finalContent = assistantText.join('') || 'No response generated.';
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            last.content = finalContent;
            delete last.streaming;
          }
          return next;
        });
        lastMessagesRef.current = [...history, { role: 'assistant', content: finalContent }];
        setStatus('idle');
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setStatus('error');
        setLastError(err.message);
      }
    },
    [apiUrl, status, userId]
  );

  const retry = useCallback(() => {
    if (status !== 'error') return;
    const history = lastMessagesRef.current.slice();
    const lastUser = history.pop();
    if (!lastUser || lastUser.role !== 'user') return;
    lastMessagesRef.current = history;
    setMessages(history);
    send(lastUser.content);
  }, [send, status]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setToolEvents([]);
    setStatus('idle');
    setLastError(null);
    lastMessagesRef.current = [];
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, []);

  return { messages, status, toolEvents, serverUp, lastError, send, retry, clear, stop };
}

// ============================================================
// Sub-components
// ============================================================

function ToolBadge({ tool }) {
  const cls =
    tool.status === 'ok' ? 'aic-tool-ok' : tool.status === 'error' ? 'aic-tool-err' : 'aic-tool-run';
  const icon = tool.status === 'ok' ? ICONS.check : tool.status === 'error' ? ICONS.alert : ICONS.wrench;
  const label =
    tool.status === 'running' ? `${tool.name}...` : tool.status === 'ok' ? `${tool.name} ✓` : `${tool.name} ✕`;
  return (
    <span className={`aic-tool ${cls}`} title={tool.summary || ''}>
      <Icon d={icon} size={12} spin={tool.status === 'running'} />
      {label}
    </span>
  );
}

function Message({ message, toolEvents, showTools }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={`aic-msg-row ${isUser ? 'aic-msg-user' : ''}`}>
      {!isUser && (
        <div className="aic-avatar aic-avatar-bot">
          <Icon d={ICONS.bot} size={16} />
        </div>
      )}
      <div className="aic-msg-col">
        <div className={`aic-bubble ${isUser ? 'aic-bubble-user' : 'aic-bubble-bot'}`}>
          {message.content || (message.streaming ? '\u00A0' : '')}
          {message.streaming && <span className="aic-cursor" aria-hidden="true" />}
        </div>
        {showTools && toolEvents.length > 0 && (
          <div className="aic-tools">
            {toolEvents.map((tool, idx) => (
              <ToolBadge key={`${tool.name}-${idx}`} tool={tool} />
            ))}
          </div>
        )}
        <div className="aic-meta">
          <span className="aic-time">{message.time}</span>
          {!isUser && !message.streaming && message.content && (
            <button type="button" className="aic-copy" onClick={copy} title="Copy message" aria-label="Copy message">
              <Icon d={copied ? ICONS.check : ICONS.copy} size={11} />
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <div className="aic-avatar aic-avatar-user">
          <Icon d={ICONS.user} size={16} />
        </div>
      )}
    </div>
  );
}

function StatusPill({ serverUp }) {
  const cls = serverUp === null ? 'aic-pill-idle' : serverUp ? 'aic-pill-check' : 'aic-pill-warn';
  const label =
    serverUp === null ? 'Checking AI server...' : serverUp ? 'AI server connected' : 'AI server unreachable';
  return (
    <span className={`aic-pill ${cls}`} title="AI server connection">
      <span className="aic-pill-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

// ============================================================
// The component
// ============================================================

export default function AiChat({
  apiUrl = DEFAULT_API_URL,
  projectName = '{{PROJECT_NAME}}',
  subtitle = 'Powered by Groq, connected via your MCP server',
  userIdKey = 'userId',
  onUserIdChange,
}) {
  const [userId, setUserId] = useState('');
  const [editingUserId, setEditingUserId] = useState(false);
  const [draftUserId, setDraftUserId] = useState('');
  const { messages, status, toolEvents, serverUp, lastError, send, retry, clear, stop } =
    useChat(apiUrl, userId);

  const busy = status === 'thinking' || status === 'streaming';
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  // Inject styles + load the user id from localStorage.
  useEffect(() => {
    ensureStyles();
    let id = readStoredUserId(userIdKey);
    if (!id) {
      id = generateUserId();
      persistUserId(userIdKey, id);
    }
    setUserId(id);
  }, [userIdKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, toolEvents, status]);

  const submitDraftUserId = () => {
    const id = draftUserId.trim();
    if (!id) return;
    setUserId(id);
    persistUserId(userIdKey, id);
    setEditingUserId(false);
    setDraftUserId('');
    onUserIdChange?.(id);
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const value = textareaRef.current?.value.trim();
    if (!value) return;
    send(value);
    textareaRef.current.value = '';
    autoResize();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="aic-wrap">
      <header className="aic-header">
        <div className="aic-header-left">
          <div className="aic-logo">
            <Icon d={ICONS.sparkles} size={16} />
          </div>
          <div>
            <h1 className="aic-title">{projectName}</h1>
            <p className="aic-subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="aic-header-actions">
          <StatusPill serverUp={serverUp} />
          {editingUserId ? (
            <input
              autoFocus
              value={draftUserId}
              onChange={(e) => setDraftUserId(e.target.value)}
              onBlur={submitDraftUserId}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitDraftUserId();
                if (e.key === 'Escape') setEditingUserId(false);
              }}
              placeholder="New user id..."
              aria-label="User ID"
              className="aic-user-chip"
              style={{ outline: 'none' }}
            />
          ) : (
            <button
              type="button"
              className="aic-user-chip"
              onClick={() => {
                setDraftUserId(userId);
                setEditingUserId(true);
              }}
              title="Click to change the user id (stored in localStorage)"
            >
              <Icon d={ICONS.user} size={11} />
              <b>{userId ? `${userId.slice(0, 8)}…` : 'no user'}</b>
            </button>
          )}
          <button type="button" className="aic-icon-btn" onClick={clear} disabled={messages.length === 0} title="Clear chat" aria-label="Clear chat">
            <Icon d={ICONS.eraser} size={14} />
          </button>
        </div>
      </header>

      <div className="aic-body" ref={scrollRef}>
        <div className="aic-scroll">
          {messages.length === 0 ? (
            <div className="aic-empty">
              <div className="aic-empty-logo">
                <Icon d={ICONS.bot} size={28} />
              </div>
              <h2>Ask about the {projectName} API</h2>
              <p>The assistant calls your API through the generated MCP server and streams the answer back.</p>
              <div className="aic-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="aic-suggestion"
                    onClick={() => send(suggestion)}
                    disabled={busy}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <Message
                key={`${message.role}-${idx}`}
                message={message}
                toolEvents={toolEvents}
                showTools={idx === messages.length - 1 && busy}
              />
            ))
          )}

          {status === 'thinking' && (
            <div className="aic-thinking">
              <div className="aic-avatar aic-avatar-bot">
                <Icon d={ICONS.bot} size={16} />
              </div>
              <div className="aic-bubble aic-bubble-bot">
                <Icon d={ICONS.wrench} size={13} spin />
                {toolEvents.length > 0 ? 'Working on it...' : 'Thinking...'}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="aic-error">
              <Icon d={ICONS.alert} size={16} />
              <p>
                <b>Something went wrong</b>
                {lastError}
              </p>
              <button type="button" className="aic-retry" onClick={retry}>
                Retry
              </button>
            </div>
          )}

          {serverUp === false && status === 'idle' && messages.length === 0 && (
            <div className="aic-note">
              <Icon d={ICONS.server} size={14} />
              AI server not reachable at {apiUrl} - is it running?
            </div>
          )}
        </div>
      </div>

      <footer className="aic-footer">
        <div className="aic-input-area">
          <div className="aic-input-row">
            <textarea
              ref={textareaRef}
              rows={1}
              className="aic-textarea"
              placeholder="Ask about your application data..."
              aria-label="Message"
              onKeyDown={handleKeyDown}
              onInput={autoResize}
              disabled={busy}
            />
            {busy ? (
              <button type="button" className="aic-send aic-stop" onClick={stop} title="Stop generating" aria-label="Stop generating">
                <Icon d={ICONS.stop} size={16} fill />
              </button>
            ) : (
              <button type="button" className="aic-send" onClick={submit} title="Send message" aria-label="Send message">
                <Icon d={ICONS.send2} size={16} />
              </button>
            )}
          </div>
          <p className="aic-hint">
            Enter to send · Shift+Enter for a new line · AI can make mistakes - verify important data.
          </p>
        </div>
      </footer>
    </div>
  );
}