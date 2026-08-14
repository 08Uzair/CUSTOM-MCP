'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  CircleDashed,
  Copy,
  Eraser,
  Loader2,
  RefreshCw,
  Send,
  ServerCrash,
  Sparkles,
  Square,
  User,
  Wrench,
  XCircle,
} from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

const SUGGESTIONS = [
  'List the data available in the system',
  'What can you help me with?',
  'Show me the endpoints of this API',
];

// ============================================================
// SSE parser (formerly lib/sse.js)
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
// API helpers (formerly lib/api.js)
// ============================================================

async function streamChat(messages, signal) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
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

async function checkServerHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================
// Chat state machine (formerly hooks/useChat.js)
// ============================================================

function useChat() {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('idle');
  const [toolEvents, setToolEvents] = useState([]);
  const [serverUp, setServerUp] = useState(null);
  const [lastError, setLastError] = useState(null);
  const abortRef = useRef(null);
  const lastMessagesRef = useRef([]);

  useEffect(() => {
    checkServerHealth().then((up) => setServerUp(up));
  }, []);

  const send = useCallback(async (text) => {
    if (!text.trim() || status === 'streaming') return;
    abortRef.current?.abort();

    const userMessage = { role: 'user', content: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    lastMessagesRef.current = [...lastMessagesRef.current, userMessage];
    const history = [...lastMessagesRef.current];
    setMessages(history);
    setStatus('thinking');
    setToolEvents([]);
    setLastError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await streamChat(history, controller.signal);
      const assistantText = [];

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', streaming: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
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
  }, [status]);

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

function ToolCallBadge({ tool }) {
  const Icon = tool.status === 'ok' ? CheckCircle2 : tool.status === 'error' ? XCircle : Loader2;
  const color =
    tool.status === 'ok'
      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300'
      : tool.status === 'error'
        ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/40 dark:text-rose-300'
        : 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 dark:text-indigo-300';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${color}`}
      title={tool.summary || (tool.args ? `Args: ${JSON.stringify(tool.args)}` : undefined)}
    >
      <Icon size={12} className={tool.status === 'running' ? 'animate-spin' : ''} aria-hidden="true" />
      {tool.name}
      {tool.status === 'running' ? '...' : tool.status === 'ok' ? ' ✓' : ' ✕'}
    </span>
  );
}

function ChatInput({ onSend, onStop, disabled, busy }) {
  const textareaRef = useRef(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = () => {
    const value = textareaRef.current?.value.trim();
    if (!value) return;
    onSend(value);
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
    <div className="flex w-full items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/50 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-900/40">
      <textarea
        ref={textareaRef}
        rows={1}
        aria-label="Message"
        placeholder="Ask about your application data..."
        className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-slate-100"
        onKeyDown={handleKeyDown}
        onInput={autoResize}
        disabled={disabled}
      />
      {busy ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop generating"
          title="Stop generating"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white transition hover:bg-rose-600"
        >
          <Square size={16} fill="currentColor" />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          aria-label="Send message"
          title="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-300/50 active:scale-95 disabled:opacity-50 dark:hover:shadow-indigo-900/50"
          disabled={disabled}
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
}

function ChatMessage({ message, toolEvents, showTools }) {
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
    <div className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-300/40 dark:shadow-indigo-900/40">
          <Bot size={16} />
        </div>
      )}
      <div className={`group flex max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'rounded-br-md bg-indigo-600 text-white shadow-indigo-300/40 dark:bg-indigo-600 dark:shadow-indigo-900/40'
              : 'rounded-bl-md bg-white text-slate-800 shadow-slate-200/60 ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:shadow-none dark:ring-slate-700'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.content || (message.streaming ? '\u00A0' : '')}</p>
          {message.streaming && (
            <span
              className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-current align-middle"
              aria-hidden="true"
            />
          )}
        </div>

        {showTools && toolEvents.length > 0 && (
          <div className="mt-1.5 flex max-w-full flex-wrap items-center gap-1.5">
            <Wrench size={11} className="shrink-0 text-slate-400" aria-hidden="true" />
            {toolEvents.map((tool, idx) => (
              <ToolCallBadge key={`${tool.name}-${idx}`} tool={tool} />
            ))}
          </div>
        )}

        <div className="mt-1 flex items-center gap-2 px-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{message.time}</span>
          {!isUser && !message.streaming && message.content && (
            <button
              type="button"
              onClick={copy}
              aria-label="Copy message"
              title="Copy message"
              className="flex h-5 w-5 items-center justify-center rounded text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-white dark:bg-slate-600">
          <User size={16} />
        </div>
      )}
    </div>
  );
}

function StatusPill({ serverUp }) {
  const dot =
    serverUp === null
      ? 'bg-slate-300 dark:bg-slate-600'
      : serverUp
        ? 'bg-emerald-500'
        : 'bg-amber-500';
  const text =
    serverUp === null
      ? 'text-slate-400'
      : serverUp
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-amber-600 dark:text-amber-400';
  const label =
    serverUp === null ? 'Checking AI server...' : serverUp ? 'AI server connected' : 'AI server unreachable';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${text}`}
      title="AI server connection"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${serverUp === null ? 'animate-pulse' : ''}`} aria-hidden="true" />
      {label}
    </span>
  );
}

// ============================================================
// The single chat widget - input, messages, status, tools, hook
// ============================================================

export default function ChatWidget({ projectName = 'AI Assistant', subtitle = 'Powered by Groq, connected via your MCP server' }) {
  const { messages, status, toolEvents, serverUp, lastError, send, retry, clear, stop } = useChat();
  const busy = status === 'thinking' || status === 'streaming';
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, toolEvents, status]);

  const thinking = status === 'thinking';

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 to-indigo-50/40 dark:from-slate-950 dark:to-slate-900">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-300/40 dark:shadow-indigo-900/40">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{projectName}</h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill serverUp={serverUp} />
          <button
            type="button"
            onClick={clear}
            disabled={messages.length === 0}
            aria-label="Clear chat"
            title="Clear chat"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Eraser size={14} />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
          {messages.length === 0 ? (
            <div className="mx-auto mt-14 w-full max-w-md text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-300/50 dark:shadow-indigo-900/50">
                <Bot size={28} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ask about the {projectName} API</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                The assistant calls your API through the generated MCP server and streams the answer back.
              </p>
              <div className="mt-6 flex flex-col items-center gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    disabled={busy}
                    className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, idx) => (
              <ChatMessage
                key={`${message.role}-${idx}`}
                message={message}
                toolEvents={toolEvents}
                showTools={idx === messages.length - 1 && busy}
              />
            ))
          )}

          {thinking && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-300/40 dark:shadow-indigo-900/40">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 size={14} className="animate-spin text-indigo-500" />
                  {toolEvents.length > 0 ? 'Working on it...' : 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mx-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900 dark:bg-rose-950/50">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Something went wrong</p>
                <p className="mt-0.5 break-words text-xs text-rose-600/90 dark:text-rose-400/90">{lastError}</p>
              </div>
              <button
                type="button"
                onClick={retry}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-700"
              >
                <RefreshCw size={12} aria-hidden="true" /> Retry
              </button>
            </div>
          )}

          {serverUp === false && status === 'idle' && messages.length === 0 && (
            <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400">
              <ServerCrash size={14} className="shrink-0" aria-hidden="true" />
              AI server not reachable at {API_URL} - is it running?
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-slate-200/80 bg-white/80 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={send} onStop={stop} disabled={busy} busy={busy} />
          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Enter to send · Shift+Enter for a new line · AI can make mistakes - verify important data.
          </p>
        </div>
      </footer>
    </div>
  );
}
