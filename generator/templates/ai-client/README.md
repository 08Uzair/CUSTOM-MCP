# {{PROJECT_NAME}} - AI Client

Browser chat interface for the {{PROJECT_NAME}} AI integration.

## Running

```bash
npm install
cp .env.example .env      # NEXT_PUBLIC_API_URL points at the AI server
npm run dev               # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | AI server URL (browser context, default `http://localhost:4000`) |

> Never put API keys in `NEXT_PUBLIC_*` variables - anything prefixed that way ships to the browser.

## Features

- Streaming responses (SSE) with live tool-call status
- Chat history in-session, retry on failure, clear chat, stop generation
- Responsive mobile-friendly layout, accessible controls

## How it works

1. You type a message.
2. `hooks/useChat.js` streams it to the AI server (`POST /api/chat`).
3. The AI server picks Groq, executes any MCP tool calls, and streams the answer back.
4. `lib/sse.js` parses the stream; `StatusBar`/`ToolCallBadge` surface tool execution.

## Customizing

- Change the assistant personality: edit the system prompt in `ai-server/src/services/chat.service.js`.
- Change the server URL: edit `.env`.