# {{PROJECT_NAME}} - MCP Server

Exposes the **{{PROJECT_NAME}}** API (`{{API_BASE_URL}}`) as Model Context Protocol tools and resources, so any MCP client (Claude Desktop, Cursor, the generated AI server, ...) can work with your application data.

## Architecture

```
MCP Client (e.g. AI Server)
        |
        | JSON-RPC (Streamable HTTP)
        v
   MCP Server (this service)  :5000
        |
        | API Adapter (env-driven)
        v
   {{PROJECT_NAME}} API : {{API_BASE_URL}}
```

Every tool funnels through the **API Adapter** (`src/adapters/api-adapter.js`): base URL, authentication, headers, query parameters, request bodies, timeouts and error handling all live there and are configured exclusively through environment variables.

## Available tools ({{MCP_TOOLS_COUNT}})

| Tool | Description |
| --- | --- |
{{MCP_TOOLS_TABLE}}

## Getting started

```bash
npm install
cp .env.example .env     # then fill in your credentials below
npm run dev              # or: npm start
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `MCP_SERVER_PORT` | Port the MCP server listens on (default `5000`) |
| `TARGET_API_BASE_URL` | Base URL of the {{PROJECT_NAME}} API |
| `TARGET_API_AUTH_TYPE` | `none`, `bearer`, `api-key`, `custom-header` or `basic` |
{{AUTH_HINTS}}
| `TARGET_API_TIMEOUT_MS` | Timeout for target API calls (default `10000`) |

Secrets are read from your local `.env` - never commit these values.

## Testing the MCP server

```bash
# Is the server up?
curl http://localhost:5000/health

# Minimal Streamable HTTP exchange (initialize + list tools)
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

## Calling a tool

```js
// With any MCP client SDK:
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": { "name": "get_users", "arguments": {} }
}
```

## Customizing tools

Open `src/config/tools.js` - it is a plain data registry. Add or change a tool by editing its entry (name, description, inputSchema, request). The executor (`src/services/endpoint.service.js`) needs no changes.

## Troubleshooting

- **401/403 responses** - check `TARGET_API_AUTH_TYPE` and the credentials in `.env`
- **Tool says "target API unreachable"** - check `TARGET_API_BASE_URL` and network access from this container/host