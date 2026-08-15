# AI Integration Generator

A platform that scans any existing application/API and generates a **fully working, standalone AI integration project** — an MCP server, an AI chat server and a single drop-in chat component (`AiChat.jsx`) — plus Docker configuration and documentation. Everything is downloaded as a ZIP and runs independently of this platform.

---

## Tech Stack

| Layer | Technology | Where |
| ----- | ---------- | ----- |
| Backend API | Node.js (ESM), Express 4, Mongoose (MongoDB), Zod validation, Helmet, express-rate-limit, morgan | `backend/` |
| Generator | Node.js (ESM), `@modelcontextprotocol/sdk`, archiver, custom template engine (token rendering) | `generator/` |
| Wizard UI | Next.js 14 (App Router), React 18, Tailwind CSS, lucide-react | `frontend/` |
| Storage | MongoDB (`mongodb://localhost:27017/ai_integration_generator`) | local mongod |
| Generated MCP Server | `@modelcontextprotocol/sdk` — Streamable HTTP transport, generic tool executor | generated `mcp-server/` |
| Generated AI Server | Express + SSE + Groq (OpenAI-compatible streaming) | generated `ai-server/` |
| Generated AI Chat | Self-contained `AiChat.jsx` (React 18+, zero deps, SSE consumption, tool-call badges) | generated `ai-chat/` |

## Ports

| Service | Port | URL |
| ------- | ---- | --- |
| Wizard (platform frontend) | 3000 | http://localhost:3000 |
| Backend API | 4000 | http://localhost:4000/api/health |
| MongoDB | 27017 | `mongodb://localhost:27017` |
| Generated MCP server | 5000 | http://localhost:5000/mcp |
| Generated AI server | 4100 | http://localhost:4100/api/health |

---

## Prerequisites

- **Node.js >= 18.17** (npm workspaces)
- **MongoDB** running locally (default database `ai_integration_generator`)
- A **Groq API key** — only needed if you want live AI answers from a generated project (never stored by this platform; goes into the generated `ai-server/.env`)

## Start & stop the application

There are two ways to run the whole application (wizard client + backend API): **directly from the root** with `run.ps1`, or **manually**, opening each service folder in its own terminal.

> MongoDB (port 27017) must be running first in both cases — e.g. `mongod` or MongoDB Atlas-compatible local service.

### Option A — directly from the root (one command, one terminal)

Open **one** VS Code terminal in the repository root:

```powershell
# --- START ---
.\run.ps1 -Install      # first time only: installs all workspaces
.\run.ps1               # start backend (:4000) + wizard (:3000)
.\run.ps1 -Dev          # optional: backend restarts on file change

# --- STOP ---
# press Ctrl+C in the running terminal, or from any terminal:
.\run.ps1 -Stop
```

`run.ps1` starts every service as a background job, prints their combined output with timestamps in the same terminal, and on `Ctrl+C` or `-Stop` kills the jobs plus any project `node`/`npm` processes and anything listening on ports 3000/4000.

### Option B — manually, folder by folder (separate terminals per service)

Open one terminal **per service**, each in the corresponding folder:

```powershell
# Terminal 1 — Backend API (:4000)
cd backend
npm install          # first time only
npm run dev          # or: npm start / node src/server.js

# Terminal 2 — Wizard frontend (:3000)
cd frontend
npm install          # first time only
npm run dev          # or: npm run build; npm run start
```

| # | Folder    | Command            | Runs                    | URL                      |
| - | --------- | ------------------ | ----------------------- | ------------------------ |
| 1 | `backend` | `npm run dev`      | Express API + job worker | http://localhost:4000    |
| 2 | `frontend`| `npm run dev`      | Next.js wizard UI       | http://localhost:3000    |

```powershell
# --- STOP ---
# press Ctrl+C in each terminal, or from the repository root:
.\run.ps1 -Stop        # cleans up any processes still left on :3000/:4000
```

| Action | Option A (root)                    | Option B (manual)                 |
| ------ | ---------------------------------- | --------------------------------- |
| START  | `.\run.ps1` (one terminal)         | `npm run dev` in `backend` + `frontend` (one terminal each) |
| STOP   | `Ctrl+C` or `.\run.ps1 -Stop`      | `Ctrl+C` in every terminal, then `.\run.ps1 -Stop` to clean up leftovers |

> `npm install` only needs to be run once per folder; after that plain `npm run dev` is enough to start each time.

---

## Data flow (vertical)

The pipeline is a multi-stage flow: wizard → API → target app → MongoDB → background job → generator templates → ZIP → download → generated runtime.

```
┌───────────────────────────────────────────────────────────────────┐
│ 1. WIZARD UI            frontend/            http://localhost:3000 │
│    StepApplication ──> StepAuthentication ──> StepAI ──>          │
│    StepDiscovery ──> StepPreview ──> StepGenerate ──> StepDownload│
└──────────────────────────────┬────────────────────────────────────┘
                               │  user config: { appUrl, apiBaseUrl, auth, ai }
                               │  apiFetch('/api/integrations/validate', ...)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│ 2. BACKEND API           backend/            http://localhost:4000 │
│    express + zod + rate-limit + SSRF guard                        │
│    POST /api/integrations/validate | /discover | /preview          │
│    POST /api/integrations/generate  | GET  /:id | /:id/status      │
│    GET  /:id/download?package=complete|ai-server|mcp-server|...    │
└───────────────┬──────────────────────┬─────────────────────────────┘
                │ validateApi()        │ generate → enqueueGeneration()
                │ (safe-fetch, SSRF)   ▼
                ▼              ┌──────────────────────────────────────┐
┌──────────────────────┐      │ 4. MONGODB  (localhost:27017)        │
│ 3. TARGET APP / API  │      │    Integration { endpoints, tools }  │
│    e.g. :3005        │◄─────┤    GenerationJob { steps[] }          │
└──────────────────────┘      │    GeneratedProject { artifacts }     │
                              └───────────────┬──────────────────────┘
                                              │ runJob() background
                                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ 5. GENERATOR            generator/src/services/generation.service │
│    validate ──> analyzeEndpoints ──> generateProject               │
│    buildProjectConfig() ──> buildTokens() ──> renderTemplate()     │
│    (ai-server, mcp-server, ai-chat, project-docs)                   │
│    writeEnvExamples() ──> zipDirectory() + sha256OfFile()          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ acme-crm-complete.zip (+ per-service)
                               ▼
┌───────────────────────────────────────────────────────────────────┐
│ 6. DOWNLOAD  browser ← GET /api/integrations/:id/download         │
│    unzip → .env: TARGET_API_BASE_URL, GROQ_API_KEY, MCP_SERVER_URL │
└──────────────────────────────┬─────────────────────────────────────┘
                               ▼   GENERATED RUNTIME (independent)
┌───────────────────────────────────────────────────────────────────┐
│ 7. GENERATED PROJECT                                             │
│                                                                   │
│    mcp-server (Express :5000)  ◄── JSON-RPC ──  ai-server (:4100)  │
│      │ tools: get_users,                                           │
│      │        create_user,      ◄── HTTP ──  groq (LLM)            │
│      │        get_user,                                           │
│      │        update_user,          SSE chat                       │
│      │        delete_user            ▲                             │
│      │ resources: api://info        │                             │
│      ▼                              │                             │
│    TARGET API (real data) ──────────┘   AiChat.jsx (in your app)    │
│    http://localhost:3005/users/3                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Code examples per stage

**1. Wizard → API** (`frontend/lib/api.js`)

```js
export async function apiFetch(path, { method = 'GET', body, params, timeoutMs } = {}) {
  const url = params ? `${API_URL}${path}?${new URLSearchParams(params)}` : `${API_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs || 30000),
  });
  // unwraps { success, data } / { success, error } envelopes
}
```

**2. Backend endpoint** (`backend/src/controllers/integration.controller.js`)

```js
export const validate = asyncHandler(async (req, res) => {
  const result = await generator.validateApi(
    { apiBaseUrl: req.body.apiBaseUrl, auth: req.body.auth },
    { timeoutMs: env.REQUEST_TIMEOUT_MS }
  );
  res.json({ success: true, data: { ...result, serverReachable: true }, message: 'Validation completed' });
});
```

**3. Background job** (`backend/src/services/generation.service.js`)

```js
await setStep(job, 1, 'running');
const analysis = await generator.analyzeEndpoints(config.endpoints, { allowedPrivateHosts: [] });
config.tools = analysis.tools;                    // { name, description, inputSchema, request }[]
await setStep(job, 1, 'completed', `${analysis.tools.length} tool(s) mapped`);

const result = await generator.generateProject(config);   // renders + zips
```

**4. Generator rendering** (`generator/src/services/generation.service.js`)

```js
for (const service of SERVICE_TEMPLATES) {
  await renderTemplate(
    path.join(templateRoot, service),          // ai-server / mcp-server / ai-chat
    path.join(projectDir, service),
    tokens                                     // { PROJECT_NAME, MCP_TOOLS_CONFIG, ... }
  );
}
```

**5. Generated MCP tool registry** (`generated <project>/mcp-server/src/config/tools.js`)

```js
export const TOOLS = [
  {
    name: 'get_user',
    description: 'Retrieves a user from the target API via GET /users/{id}.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Value for the :id path parameter' } }, required: ['id'] },
    request: { method: 'GET', path: '/users/{id}', pathParams: null, queryParams: [], body: false },
  },
  // ... create_user, update_user, delete_user, get_users
];
```

**6. Generated tool execution** (`generated <project>/mcp-server/src/adapters/api-adapter.js`)

```js
const response = await fetch(url, { method: request.method, headers, body, signal: controller.signal });
```

**7. Generated AI chat loop** (`generated <project>/ai-server/src/services/chat.service.js`)

```js
const completion = await this.provider.complete({ messages: current, tools: this.mcp.aiToolList() });
if (!completion.toolCalls?.length) {
  await this.#streamFinal(current, emit);       // stream final answer (SSE deltas)
} else {
  for (const call of completion.toolCalls) {
    executed = await this.mcp.callTool(call.name, call.arguments);  // JSON-RPC → MCP server
  }
}
```

---

## Generated project

```
<project>/
├── ai-server/         Express SSE chat API: Groq ──> MCP tools
├── mcp-server/        Streamable HTTP MCP server (tools + api://info resource)
├── ai-chat/           AiChat.jsx drop-in component + INSTALL.md (zero deps)
├── README.md          project documentation
├── docker-compose.yml both servers containerized
└── .env.example       one per service (secrets always empty)
```

Tool naming follows the specification:

```
GET /users          -> get_users
GET /users/:id      -> get_user
POST /users         -> create_user
PUT /users/:id      -> update_user
DELETE /users/:id   -> delete_user
```

The MCP server is a **generic executor over a pure-data tool registry** — tools are data, not code, so the generated server can never degrade into an unrestricted HTTP proxy.

## Security

- **SSRF guard**: private/non-HTTP hosts are blocked during discovery (`ALLOWED_PRIVATE_HOSTS` overrides exist for local development only)
- **Secrets never persisted**: `.env.example` files ship empty; API keys are entered directly into the generated `ai-server/.env`
- **ZIP hardening**: path-traversal rejection, per-service package isolation
- **Artifact expiry**: generated ZIPs auto-clean after `ARTIFACT_TTL_HOURS` (default 24)

## Repository layout

```
├── backend/       Express REST API + job pipeline (validation, discovery, generation, zip, download)
├── generator/     Rendering engine: endpoint analysis → MCP tool definitions → template rendering → ZIP
├── frontend/      Next.js wizard (7 steps) + dashboard/installed integrations
├── generated/     ZIP artifacts (git-ignored)
├── run.ps1        one-command startup script
└── docker-compose.yml
```

## Scripts

```bash
npm run lint          # ESLint across all workspaces
npm run format        # Prettier
npm run build         # production build of the wizard frontend
```