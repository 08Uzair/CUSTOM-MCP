'use client';

import {
  BookOpen,
  Boxes,
  CheckCircle2,
  Copy,
  Cpu,
  FileCode2,
  GitBranch,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  Rocket,
  ShieldCheck,
  Terminal,
  Wrench,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { NavBar } from '@/components/ui/NavBar';

const SECTIONS = [
  { id: 'overview', title: 'Overview', icon: BookOpen },
  { id: 'quickstart', title: 'Quick start', icon: Zap },
  { id: 'concepts', title: 'Key concepts', icon: HelpCircle },
  { id: 'architecture', title: 'Architecture', icon: GitBranch },
  { id: 'structure', title: 'Folder structure', icon: LayoutDashboard },
  { id: 'installation', title: 'Installation', icon: Terminal },
  { id: 'workflow', title: 'Generation workflow', icon: Wrench },
  { id: 'mcp', title: 'MCP server', icon: Boxes },
  { id: 'ai', title: 'AI server', icon: Cpu },
  { id: 'security', title: 'Security', icon: ShieldCheck },
  { id: 'deployment', title: 'Deployment', icon: Rocket },
  { id: 'troubleshooting', title: 'Troubleshooting', icon: Wrench },
];

/* ---------- Reusable doc widgets ---------- */

function Code({ children }) {
  return (
    <code className="rounded-md border border-slate-700/60 bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-300">
      {children}
    </code>
  );
}

function CodeBlock({ title = 'terminal', code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <Terminal size={12} aria-hidden="true" /> {title}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code block"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          {copied ? (
            <CheckCircle2 size={12} className="text-emerald-400" />
          ) : (
            <Copy size={12} />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-slate-300">
        {code}
      </pre>
    </div>
  );
}

function Callout({ tone = 'info', title, children }) {
  const styles = {
    info: {
      icon: Lightbulb,
      header: 'text-indigo-300',
      box: 'border-indigo-500/25 bg-indigo-500/[0.07]',
    },
    tip: {
      icon: CheckCircle2,
      header: 'text-emerald-300',
      box: 'border-emerald-500/25 bg-emerald-500/[0.07]',
    },
    warn: {
      icon: ShieldCheck,
      header: 'text-amber-300',
      box: 'border-amber-500/25 bg-amber-500/[0.07]',
    },
  };
  const { icon: Icon, header, box } = styles[tone];
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${box}`}>
      <p
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${header}`}
      >
        <Icon size={13} aria-hidden="true" /> {title}
      </p>
      <div className="mt-1.5 text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
      <span
        className="h-5 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500"
        aria-hidden="true"
      />
      {children}
    </h2>
  );
}

function SubHeading({ children }) {
  return <h3 className="mt-5 text-sm font-semibold text-slate-200">{children}</h3>;
}

/* ---------- Section content ---------- */

function OverviewSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Overview</SectionHeading>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        The <strong className="text-slate-200">AI Integration Generator</strong> is a tool
        that adds an <strong className="text-slate-200">AI assistant</strong> to{' '}
        <em>any</em> existing HTTP API. You tell it where your API lives, it inspects the
        endpoints (what you can call and with which data), and it generates a complete,
        ready-to-run project with an AI chatbot that can actually <em>use</em> your API by
        itself.
      </p>

      <SubHeading>What you get out of the box</SubHeading>
      <ul className="mt-2 list-inside space-y-2 text-sm leading-relaxed text-slate-400">
        <li className="flex gap-2">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
          <span>
            <strong className="text-slate-200">An MCP Server</strong> — a bridge that
            converts your API into "tools" (e.g. <Code>get_users</Code>,{' '}
            <Code>create_user</Code>) an AI model can call safely.
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
          <span>
            <strong className="text-slate-200">An AI Server</strong> — a small backend
            powered by Groq (fast, free-tier friendly) that understands questions and
            calls your tools to answer them.
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
          <span>
            <strong className="text-slate-200">An AI Chat Client</strong> — a friendly
            chat UI showing what the AI is doing while it works (thinking, calling tools,
            streaming answers).
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          /> s
          <span>
            <strong className="text-slate-200">Docker configuration</strong> — run all
            three services with a single <Code>docker compose up</Code> command.
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={15}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />
          <span>
            <strong className="text-slate-200">Documentation</strong> — a README set plus{' '}
            <Code>.env.example</Code> files; you add your own secret keys locally, and
            they are never stored or exported by the generator.
          </span>
        </li>
      </ul>

      <Callout tone="tip" title="In plain English">
        Think of the generator as a <em>factory</em> for AI integrations. You provide the
        blueprint (your API), it builds the finished product in a few minutes, and you
        walk away with a project that{' '}
        <strong>does not depend on this platform at all</strong>. After download it runs
        100% on your own machine or server.
      </Callout>
    </section>
  );
}

function QuickStartSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Quick start (5 minutes)</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        The fastest way to see the whole flow. Each numbered step maps to one screen
        inside the wizard.
      </p>
      <ol className="mt-4 space-y-4">
        {[
          {
            num: 1,
            title: 'Open the wizard',
            detail: 'Click "New Integration" in the top navigation (or visit /create).',
            hint: 'Everything is a form — nothing to install yet.',
          },
          {
            num: 2,
            title: 'Describe your application',
            detail:
              'Enter a project name, your app URL, and your API base URL (e.g. https://example.com/api). The API base URL is the most important field.',
            hint: 'If your API lives locally, use http://localhost:3005 while developing.',
          },
          {
            num: 3,
            title: 'Pick the authentication method',
            detail:
              'Choose how other programs (and the future chatbot) should prove their identity to your API: none, Bearer token, API key, custom header, or Basic auth.',
            hint: 'Your credentials are only used for a live test — they are never saved.',
          },
          {
            num: 4,
            title: 'Confirm the AI provider',
            detail:
              'Groq powers the chat. The model is fixed to <Code>openai/gpt-oss-120b</Code> for every generated project — no selection needed.',
            hint: 'You will paste your own GROQ_API_KEY into the generated project later.',
          },
          {
            num: 5,
            title: 'Run the connection test',
            detail:
              'The generator checks that your API is reachable, detects JSON responses and looks for an OpenAPI specification automatically.',
            hint: 'No OpenAPI found? No problem — you can add endpoints by hand.',
          },
          {
            num: 6,
            title: 'Preview, then generate',
            detail:
              'Review the generated tools, ports and environment setup. Press "Generate project" and watch the progress bar.',
            hint: 'Generation usually takes only a few seconds.',
          },
          {
            num: 7,
            title: 'Download and run',
            detail: `Download the ZIP, extract it, then:`,
            hint: 'done',
          },
        ].map((step) => (
          <li key={step.num} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/30">
              {step.num}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-200">{step.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-400">
                {step.detail}
              </p>
              {step.num === 7 && (
                <CodeBlock
                  title="your-project-folder"
                  code={`cp .env.example .env   # fill in your real keys
npm install             # install dependencies once
docker compose up       # or run npm run dev in each service folder`}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      <Callout tone="tip" title="Does it really run anywhere?">
        Yes. The generated project contains plain JavaScript (no proprietary framework),
        uses standard Express and Next.js, and ships a <Code>docker-compose.yml</Code>. It
        runs on Windows, macOS or Linux.
      </Callout>
    </section>
  );
}

function ConceptsSection() {
  const terms = [
    {
      term: 'API',
      plain:
        'A set of rules your application exposes so other programs can talk to it — like a waiter between your data and the outside world.',
      example: 'GET /users returns the list of users. POST /users creates a new one.',
    },
    {
      term: 'Endpoint',
      plain:
        'One specific address + action combination inside an API. Every endpoint has a method (verb) and a path (address).',
      example: 'GET /users/:id fetches the user whose id you put in the URL.',
    },
    {
      term: 'MCP (Model Context Protocol)',
      plain:
        'An open standard that lets AI models discover and call tools — your API endpoints — in a structured, checkable way instead of free-form HTTP.',
      example:
        'The generated mcp-server exposes get_user as a tool the AI can invoke reliably.',
    },
    {
      term: 'Tool (in MCP)',
      plain:
        'A named, validated operation the AI can call. Tools have a name, a description and an input schema so the AI knows exactly what data to provide.',
      example: 'create_user with input { name, email } performs a real POST /users call.',
    },
    {
      term: 'SSE (Server-Sent Events)',
      plain:
        'A simple way for the server to keep pushing text updates to the browser over one open connection — used to stream the AI answer word by word.',
      example: 'The chat client shows "Thinking..." then live typing.',
    },
    {
      term: 'Zod',
      plain:
        'A JavaScript validation library that checks user input against a schema before it touches your code — bad input is rejected early with a clear message.',
      example: 'The AI-Chat server validates tool arguments before calling your API.',
    },
    {
      term: 'SSRF (Server-Side Request Forgery)',
      plain:
        'An attack where someone tricks your server into making requests to private/internal addresses it should never reach (e.g. your own database).',
      example:
        'The generator blocks requests to private IP ranges unless explicitly allowlisted for local development.',
    },
    {
      term: 'OpenAPI / Swagger',
      plain:
        'A machine-readable file describing the entire API (all endpoints, parameters, response shapes). It lets us discover everything automatically.',
      example: 'Often available at /openapi.json or /swagger.json on the same domain.',
    },
    {
      term: 'Tool-calling loop',
      plain:
        'A conversation between the AI and your API: AI decides which tool to call → your API answers → AI forms the final human-friendly reply.',
      example: 'User: "How many users?" → AI calls get_users → AI answers "42 users."',
    },
  ];

  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Key concepts (plain-English glossary)</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        These words appear everywhere in this project. Each entry explains the idea, plus
        a concrete example.
      </p>
      <dl className="mt-4 space-y-3">
        {terms.map((item) => (
          <div
            key={item.term}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
          >
            <dt className="text-sm font-bold text-indigo-300">{item.term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-slate-400">{item.plain}</dd>
            <dd className="mt-1.5 font-mono text-xs text-slate-500">
              Example: {item.example}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Architecture</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        The platform itself (what you see right now) and the <em>generated project</em>{' '}
        are two separate worlds. This diagram shows how the platform screens connect.
      </p>
      <CodeBlock
        title="platform - request flow"
        code={`Browser ──► Frontend (Next.js :3000)
     │ REST / SSE
     ▼
Backend (Express :4000) ──► MongoDB (Mongoose)
     │
     ├── generator (@aig/generator)
     │     ├── analyzers   : validate → discover → OpenAPI → endpoints
     │     ├── templates   : ai-server / mcp-server / ai-chat / project-docs
     │     └── services    : configuration · generation · documentation
     │                        + zip (archiver) + SSRF-safe fetcher
     ▼
generated/<id>/  (project + 4 ZIPs, TTL-cleaned)`}
      />
      <SubHeading>Data flow — what happens when you press each wizard button</SubHeading>
      <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm leading-relaxed text-slate-400">
        <li>
          <Code>POST /api/integrations/validate</Code> — quick preflight: is the server
          reachable, does the endpoint answer with JSON?
        </li>
        <li>
          <Code>POST /api/integrations/discover</Code> — deep scan: looks for an OpenAPI
          document and analyzes every endpoint it finds (or lets you add them manually).
        </li>
        <li>
          <Code>POST /api/integrations/preview</Code> — builds the plan: which MCP tools
          are created, which ports each service uses, which environment variables are
          needed.
        </li>
        <li>
          <Code>POST /api/integrations/generate</Code> — saves your integration and starts
          a background job.
        </li>
        <li>
          <Code>GET /status</Code> — the wizard polls the job, showing step-by-step
          progress in real time.
        </li>
        <li>
          <Code>GET /download?package=</Code> — streams the complete ZIP or a per-service
          ZIP to your browser.
        </li>
      </ol>
      <Callout tone="info" title="What about the generated project's architecture?">
        The generated download contains its own two servers and one drop-in component:{' '}
        <strong>AiChat.jsx</strong> (a self-contained React component you copy into your
        app) streams chat over SSE to <strong>AI Server (Express :4000)</strong>, which
        uses Groq for the AI brain and talks to the <strong>MCP Server (:5000)</strong>{' '}
        over JSON-RPC. The MCP server is the only component that makes real HTTP calls to
        your API.
      </Callout>
    </section>
  );
}

function StructureSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Folder structure</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        A quick map of the repository. Each top-level folder has one clear job.
      </p>
      <CodeBlock
        title="ai-integration-generator/"
        code={`ai-integration-generator/
├── frontend/          # Next.js wizard UI (the screens you are clicking right now)
│   ├── app/           #   /dashboard /create /integrations/[id] /documentation /settings
│   ├── components/    #   ui/ (buttons, cards...) wizard/ integration/ tables
│   ├── hooks/         #   useIntegrations, pollers
│   └── lib/           #   api.js (fetch + error envelopes), validators.js
├── backend/           # Express REST API + background job pipeline
│   └── src/           #   config/ controllers/ routes/ services/ middleware/
│                      #   models/ validators/ utils/
├── generator/         # the engine that builds projects (@aig/generator)
│   ├── templates/     #   ai-server/ mcp-server/ ai-chat/ project-docs/
│   ├── analyzers/     #   api/ openapi/ endpoint analyzers + discovery
│   ├── services/      #   generation/ configuration/ documentation
│   ├── adapters/      #   api-adapter (endpoint → MCP tool registry)
│   └── zip/           #   zip.service (path-traversal-safe archives)
├── generated/         # artifact output (git-ignored - not committed)
├── docker-compose.yml
└── README.md`}
      />
      <Callout tone="info" title="Where should I start reading?">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Frontend newcomer?</strong> Start in{' '}
            <Code>frontend/components/wizard/</Code> — each file is one wizard screen.
          </li>
          <li>
            <strong>Backend newcomer?</strong> Start in <Code>backend/src/routes/</Code>{' '}
            (what URLs exist) then <Code>controllers/</Code> (what they do).
          </li>
          <li>
            <strong>Curious how projects are built?</strong>{' '}
            <Code>generator/src/services/generation.service.js</Code> is the heart.
          </li>
        </ul>
      </Callout>
    </section>
  );
}

function InstallationSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Installation (run this platform)</SectionHeading>
      <SubHeading>Requirements</SubHeading>
      <ul className="mt-2 list-inside space-y-1 text-sm text-slate-400">
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          Node.js 18.17+ (tested on 20/22/24)
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          MongoDB 6+ — local (<Code>mongod</Code>) or via{' '}
          <Code>docker compose up mongo</Code>
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          A target API to integrate (hosted or on your machine)
        </li>
      </ul>
      <SubHeading>Step by step</SubHeading>
      <CodeBlock
        title="terminal - first time"
        code={`npm install                     # installs all workspaces
cp .env.example .env            # then configure MONGO_URI etc. in .env
npm run dev:backend             # API on  :4000
npm run dev:frontend            # UI on   :3000  (or simply: npm run dev for both)`}
      />
      <Callout tone="warn" title="Local API? Read this">
        SSRF protection blocks private networks by default. During development add your
        local host to <Code>ALLOWED_PRIVATE_HOSTS</Code>, e.g.{' '}
        <Code>ALLOWED_PRIVATE_HOSTS=localhost,127.0.0.1</Code>. This setting is for
        development only — never set it in production.
      </Callout>
      <Callout tone="tip" title="Alternative one-command start">
        On Windows you can also use <Code>.\run.ps1</Code> from the repository root — it
        starts backend and frontend together and cleans up on <Code>Ctrl+C</Code>.
      </Callout>
    </section>
  );
}

function WorkflowSection() {
  const lines = [
    {
      name: 'Application',
      detail:
        'Project name, app URL, API base URL. This defines what the generated project will be called and which API it talks to.',
    },
    {
      name: 'Authentication',
      detail:
        'none · bearer · api-key · custom-header · basic. Credentials are used transiently for live tests and never stored or exported.',
    },
    {
      name: 'AI configuration',
      detail:
        'Provider <Code>groq</Code> with a fixed model (<Code>openai/gpt-oss-120b</Code>). The generated code contains a provider abstraction (<Code>ai-server/src/providers/</Code>) so OpenAI, Anthropic, Gemini, Ollama or OpenRouter can be plugged in later.',
    },
    {
      name: 'API discovery',
      detail:
        '"Test connection" validates the URL, checks server + endpoint, detects JSON, hunts for OpenAPI/Swagger documents, and analyzes endpoints.',
    },
    {
      name: 'Request payloads',
      detail:
        'Define the exact payload each endpoint expects: field names, types, required flags and an optional example JSON. The AI assistant uses this contract to build requests and to ask for missing fields instead of guessing.',
    },
    {
      name: 'Preview',
      detail:
        'Review the tool registry (the exact list of AI-callable tools), the ports each service uses, and the environment contract.',
    },
    {
      name: 'Generate',
      detail:
        'A background job renders the templates, writes <Code>.env.example</Code> files, documentation and docker-compose, then produces the ZIPs.',
    },
    {
      name: 'Download',
      detail: 'Grab the complete project ZIP or individual service ZIPs.',
    },
  ];
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Generation workflow</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        The wizard has 8 steps. Here is what each one actually does behind the scenes:
      </p>
      <ol className="mt-4 space-y-3">
        {lines.map((s, idx) => (
          <li
            key={s.name}
            className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-indigo-300">
              {idx + 1}
            </span>
            <div className="text-sm leading-relaxed text-slate-400">
              <p className="font-semibold text-slate-200">{s.name}</p>
              <p className="mt-0.5">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function McpSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>MCP server (generated)</SectionHeading>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Runs on port <Code>5000</Code> (<Code>MCP_SERVER_PORT</Code>). It implements the
        MCP Streamable HTTP transport on <Code>POST /mcp</Code> using the official{' '}
        <Code>@modelcontextprotocol/sdk</Code> — with session management, tool listing and
        tool execution.
      </p>
      <p className="mt-3 text-sm text-slate-400">
        Tools are generated as a <strong className="text-slate-200">data registry</strong>{' '}
        (<Code>src/config/tools.js</Code>) consumed by one generic executor in{' '}
        <Code>src/services/endpoint.service.js</Code>. Because tools are data — not code —
        a generated server can never turn into an unrestricted HTTP proxy.
      </p>
      <CodeBlock
        title="src/config/tools.js - naming convention"
        code={`GET    /users       → get_users       (list)
GET    /users/:id   → get_user        (single)
POST   /users       → create_user
PUT    /users/:id   → update_user
DELETE /users/:id   → delete_user`}
      />
      <p className="mt-3 text-sm text-slate-400">
        Every tool comes with: a name, a description, a JSON-Schema input, Zod validation,
        an env-driven request via the API adapter, centralized error handling, and
        normalized JSON responses. There is no unrestricted HTTP-proxy tool.
      </p>
      <Callout tone="info" title="Why does this matter for beginners?">
        Human developers can call your API any way they like. AIs can't guess — they need
        a precise contract. The MCP server is that contract: it tells the model exactly
        which operations exist and exactly what input each one accepts.
      </Callout>
    </section>
  );
}

function AiSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>AI server (generated)</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        Runs on port <Code>4000</Code> (<Code>AI_SERVER_PORT</Code>). It owns the
        conversation loop between the user, the Groq model and your API.
      </p>
      <CodeBlock
        title="POST /api/chat → SSE events"
        code={`status     "Thinking...", "Calling get_users..."
tool_call  { name, args }
tool_result{ name, success, summary }
delta      { text }      ← streamed answer
done / error`}
      />
      <ul className="mt-3 list-inside space-y-1.5 text-sm leading-relaxed text-slate-400">
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          MCP tool discovery at startup (<Code>src/mcp/mcp-client.js</Code>).
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          A bounded tool-calling loop (<Code>MAX_TOOL_ROUNDS</Code>, default 5) so the AI
          can never spiral into endless API calls.
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          Provider abstraction in <Code>src/providers/</Code> — Groq is implemented via
          its OpenAI-compatible REST API; new providers just implement{' '}
          <Code>complete()</Code> + <Code>stream()</Code>.
        </li>
        <li className="flex gap-2">
          <CheckCircle2
            size={14}
            className="mt-0.5 shrink-0 text-emerald-400"
            aria-hidden="true"
          />{' '}
          <Code>GROQ_API_KEY</Code> is read from the environment — never hardcoded, never
          exported.
        </li>
      </ul>
      <Callout tone="tip" title="Try it live">
        In the generated chat client, ask e.g. <em>"List all users"</em>. Watch the status
        badges: the AI will call <Code>get_users</Code> and stream a real answer built
        from real data from your API.
      </Callout>
    </section>
  );
}

function SecuritySection() {
  const items = [
    {
      title: 'SSRF protection',
      detail: (
        <>
          Only <Code>http(s)</Code> is allowed; DNS-resolved IPs are checked against
          private/loopback/link-local/multicast/ULA ranges; cloud-metadata ranges (
          <Code>169.254.0.0/16</Code>) are always blocked; redirects are re-validated per
          hop (max 2).
        </>
      ),
    },
    {
      title: 'Private hosts blocked by default',
      detail: (
        <>
          Blocked unless explicitly allowlisted via <Code>ALLOWED_PRIVATE_HOSTS</Code>{' '}
          (development only).
        </>
      ),
    },
    {
      title: 'Input validation',
      detail: <>Zod on every endpoint; URL shape checks on both client and server.</>,
    },
    {
      title: 'Rate limiting',
      detail: (
        <>
          express-rate-limit everywhere, stricter on <Code>validate</Code>/
          <Code>discover</Code>/<Code>generate</Code>.
        </>
      ),
    },
    { title: 'CORS + Helmet', detail: <>Origin allowlist; hardened HTTP headers.</> },
    {
      title: 'No secret persistence',
      detail: (
        <>
          Auth values are transient (live tests only) — never stored in MongoDB and never
          written into ZIPs. Generated projects ship <Code>.env.example</Code>{' '}
          placeholders.
        </>
      ),
    },
    { title: 'Timeouts', detail: <>All outbound calls are bounded (default 10s).</> },
    {
      title: 'ZIP safety',
      detail: <>Entry paths are normalized; path traversal is rejected.</>,
    },
    {
      title: 'Artifact cleanup',
      detail: (
        <>
          Generated artifacts expire after <Code>ARTIFACT_TTL_HOURS</Code> (24h default).
        </>
      ),
    },
  ];
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Security</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        Security is enforced at every layer — here is what each control protects against:
      </p>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm leading-relaxed text-slate-400"
          >
            <ShieldCheck
              size={16}
              className="mt-0.5 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            <span>
              <strong className="text-slate-200">{item.title}.</strong> {item.detail}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeploymentSection() {
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Deployment</SectionHeading>
      <SubHeading>Running this platform itself</SubHeading>
      <CodeBlock
        title="terminal - platform"
        code={`docker compose up --build
# mongo:27017 · backend:4000 · frontend:3000`}
      />
      <SubHeading>Running a generated project</SubHeading>
      <CodeBlock
        title="terminal - generated project"
        code={`cd generated-ai-integration
docker compose up --build
# AiChat.jsx → copy into your app (browser)
# AI Server  → http://localhost:4000
# MCP Server → http://localhost:5000`}
      />
      <Callout tone="warn" title="Deploying to a hosting platform?">
        Ports are configurable via environment variables. Always set secrets (
        <Code>GROQ_API_KEY</Code>, <Code>TARGET_API_*</Code>) as environment variables in
        your hosting platform — never commit <Code>.env</Code> files to git.
      </Callout>
    </section>
  );
}

function TroubleshootingSection() {
  const issues = [
    {
      symptom: 'Backend starts but says "MongoDB connection failed"',
      causes: [
        'MongoDB is not running on :27017 — start it with <Code>mongod</Code> or <Code>docker compose up mongo</Code>.',
        'MONGO_URI in <Code>.env</Code> is wrong or points to an unreachable Atlas cluster.',
        'Using Atlas behind a VPN/DNS filter — try adding public resolvers or check the cluster still exists.',
      ],
      fix: 'Confirm connectivity first: <Code>mongosh mongodb://localhost:27017 --eval "db.runCommand({ping:1})"</Code>.',
    },
    {
      symptom: 'Discovery says the API is unreachable',
      causes: [
        'An SSRF guard blocked a private/local address (localhost/192.168.x.x).',
        'Wrong API base URL (missing /api path).',
        'The target server is down or behind a firewall.',
      ],
      fix: (
        <>
          Add your local host to <Code>ALLOWED_PRIVATE_HOSTS</Code> in <Code>.env</Code>{' '}
          (dev only), then restart the backend. Verify the URL returns JSON in a browser
          first.
        </>
      ),
    },
    {
      symptom: 'Chat answers without real data',
      causes: [
        'The MCP server and AI server are on different ports than the AI client expects.',
        'GROQ_API_KEY is missing or invalid in <Code>ai-server/.env</Code>.',
        'Your API requires auth and the tokens are not set in <Code>mcp-server/.env</Code>.',
      ],
      fix: 'Compare the ports in each service .env, fill every secret, then restart all three services and retry.',
    },
    {
      symptom: 'Generation job shows "failed"',
      causes: [
        'The target API timed out during analysis.',
        'A template variable was empty (empty name/URL).',
        'Disk space or file permissions inside the generated folder.',
      ],
      fix: (
        <>
          Check the <Code>error</Code> field on the integration page. Re-run with a
          shorter API (fewer endpoints) to isolate the problem.
        </>
      ),
    },
  ];
  return (
    <section className="card-surface animate-fade-in-up p-6">
      <SectionHeading>Troubleshooting</SectionHeading>
      <p className="mt-3 text-sm text-slate-400">
        The four most common issues — with the likely causes and what to do about them:
      </p>
      <div className="mt-4 space-y-4">
        {issues.map((issue) => (
          <div
            key={issue.symptom}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <p className="flex items-start gap-2 text-sm font-semibold text-amber-300">
              <Wrench size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{' '}
              {issue.symptom}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Possible causes
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-400">
              {issue.causes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-2 flex items-start gap-2 text-sm text-slate-400">
              <CheckCircle2
                size={14}
                className="mt-0.5 shrink-0 text-emerald-400"
                aria-hidden="true"
              />
              <span>
                <strong className="text-slate-200">Fix:</strong> {issue.fix}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function DocumentationPage() {
  const [active, setActive] = useState('overview');

  const sections = {
    overview: <OverviewSection />,
    quickstart: <QuickStartSection />,
    concepts: <ConceptsSection />,
    architecture: <ArchitectureSection />,
    structure: <StructureSection />,
    installation: <InstallationSection />,
    workflow: <WorkflowSection />,
    mcp: <McpSection />,
    ai: <AiSection />,
    security: <SecuritySection />,
    deployment: <DeploymentSection />,
    troubleshooting: <TroubleshootingSection />,
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="mx-auto max-w-6xl gap-6 px-4 py-8 lg:flex">
        <aside className="w-full shrink-0 lg:w-64">
          <nav
            aria-label="Documentation sections"
            className="sticky top-20 space-y-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm"
          >
            <p className="flex items-center gap-1.5 px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <FileCode2 size={12} aria-hidden="true" /> Guide sections
            </p>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                aria-current={active === section.id ? 'true' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                  active === section.id
                    ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <section.icon size={15} aria-hidden="true" /> {section.title}
              </button>
            ))}
            <div className="mt-2 border-t border-slate-800 px-3 pb-1 pt-3">
              <p className="text-xs text-slate-500">Still stuck?</p>
              <Link
                href="/create"
                className="mt-1 inline-block text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
              >
                Try the 5-minute quick start →
              </Link>
            </div>
          </nav>
        </aside>

        <article className="mt-6 min-w-0 flex-1 space-y-6 lg:mt-0">
          <header className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <BookOpen size={12} aria-hidden="true" /> Beginner-friendly guide
            </p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
              Documentation <span className="text-gradient">made simple</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Everything you need to understand this platform — and the projects it
              generates. Written for junior developers: plain-English explanations, real
              examples, and no assumed knowledge.
            </p>
          </header>
          {sections[active]}
        </article>
      </div>
    </div>
  );
}
