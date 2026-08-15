# Installing the AI Chat component

Drop this chat into **any React app** (Next.js, Vite, CRA, Remix, ...) in two minutes.

## 1. Packages you have to install

**`AiChat.jsx` itself needs ZERO extra packages** - it is plain React 18+ with
its own scoped CSS and inline SVG icons. No UI library, no icon library, no
Tailwind, nothing.

```
Required:  react >= 18          (already in your app)
Optional:  none
```

The two servers bring their own dependencies (declared in their `package.json`,
installed automatically by `run.ps1` or a plain `npm install`):

```
ai-server : express, cors, dotenv, zod, openai, @modelcontextprotocol/sdk
mcp-server: express, cors, dotenv, zod, @modelcontextprotocol/sdk
```

## 2. Copy the component into your app

```bash
# from the generated project
cp AiChat.jsx /path/to/your-app/src/components/AiChat.jsx
```

## 3. Render it where you want the AI agent

```jsx
import AiChat from './components/AiChat';

// Anywhere in your app - it fills its container, give it a height:
<div style={{ height: '600px' }}>
  <AiChat
    apiUrl="http://localhost:{{PORT_AI_SERVER}}"
    projectName="MyApp AI Assistant"
  />
</div>
```

Props:

| Prop | Default | Purpose |
| --- | --- | --- |
| `apiUrl` | `http://localhost:{{PORT_AI_SERVER}}` | The ai-server base URL the browser talks to |
| `projectName` | `AI Assistant` | Title in the header |
| `subtitle` | `Powered by Groq...` | Small text under the title |
| `userIdKey` | `userId` | localStorage key used for the user id |
| `onUserIdChange` | - | Callback `(userId) => void` when the id changes |

## 4. Start the servers (ai-server + mcp-server)

```powershell
.\run.ps1          # npm installs (if needed) + starts both servers
.\run.ps1 -Stop    # stop everything
```

- The **mcp-server** is pre-wired to **your application API** at
  `TARGET_API_BASE_URL` (`mcp-server/.env`) - the URL/port you entered in
  step 1 of the generator.
- The **ai-server** is pre-wired to the **mcp-server** at
  `MCP_SERVER_URL` (`ai-server/.env`).
- Both accept CORS from any origin, so your app can call the ai-server from
  any host/port.

## 5. User ID (localStorage) - automatic

The component manages the user id for you:

1. On load it reads `localStorage['userId']` (falls back to
   `userID` / `user_id` / `userid`).
2. If nothing is stored yet, it **generates an id and persists it** under
   your `userIdKey`.
3. The id is sent with **every chat request** (`{ messages, userId }`).
4. The ai-server adds it to the AI's context AND **auto-injects it into tool
   payloads** whenever a tool schema requires a user id (e.g. `userId`,
   `user_id`) and the value is missing - so your API routes always receive
   it.
5. Click the user chip in the header to change the id (persisted to
   localStorage immediately).

If your app already stores the id under a different key:

```jsx
<AiChat userIdKey="my-session-key" />
```