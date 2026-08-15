# {{PROJECT_NAME}} - AI Server

Chat backend that connects the AI (Groq) to your application through the generated MCP server.

## Architecture

```
Your App (ai-chat/AiChat.jsx component)
        |
        | SSE chat stream
        v
   AI Server (this service) :{{PORT_AI_SERVER}}
        |
        | Groq Responses API
        v
        Groq (openai/gpt-oss-120b, fallback llama-3.3-70b-versatile)
        ^
        | MCP tools/call (Streamable HTTP)
        |
   MCP Server (:{{PORT_MCP_SERVER}}) --> your API ({{API_BASE_URL}})
```

The AI never calls your API directly - every data access happens through an MCP tool provided by the MCP server.

## Getting started

```bash
npm install
cp .env.example .env    # then fill in GROQ_API_KEY
npm run dev             # or: npm start
```

| Variable | Purpose |
| --- | --- |
| `AI_SERVER_PORT` | Port (default `4000`) |
| `GROQ_API_KEY` | **Required** - your Groq key from https://console.groq.com |
| `GROQ_MODEL` | Model id, e.g. `{{AI_MODEL}}` |
| `GROQ_MODEL_FALLBACK` | Used automatically when the primary model is rate-limited |
| `MCP_SERVER_URL` | URL of the MCP server (default `http://localhost:5000/mcp`) |
| `CORS_ORIGINS` | Browser origins allowed to chat - `*` by default (the component lives in your app) |

## API

**POST /api/chat** - streaming chat. Request:

```json
{
  "messages": [{ "role": "user", "content": "How many users are in the system?" }],
  "userId": "user-123"
}
```

`userId` is optional but recommended - the `AiChat` component reads it from
`localStorage` automatically. The server adds it to the AI's context and
**injects it into tool payloads** whenever a tool schema requires a user id
(e.g. `userId`, `user_id`).

Response is a Server-Sent Events stream: `status`, `tool_call`, `tool_result`, `delta`, `usage`, `done`, `error`.

**GET /api/tools** - lists the MCP tools currently registered.

**GET /api/health** - service health.

## Conversation flow

1. Client streams the message history.
2. The AI server adds the system prompt and asks Groq with the MCP tools attached.
3. If Groq asks for a tool, the AI server calls the MCP server and feeds the result back.
4. Steps 2-3 repeat up to `MAX_TOOL_ROUNDS` (default 5).
5. The final answer streams to the client as `delta` events.

## Adding another AI provider

Implement `src/providers/<name>.provider.js` with the same `complete()` / `stream()` interface and register it in `src/providers/ai-provider.js`. Nothing else changes.