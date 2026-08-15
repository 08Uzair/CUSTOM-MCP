import { ArrowRight, Bot, Boxes, FileCode2, Server, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const FEATURES = [
  { icon: Server, title: 'MCP Server', text: 'Your API exposed as typed MCP tools with validation, auth and error handling - no proxy soup.' },
  { icon: Bot, title: 'AI Server', text: 'Groq chat backend with a provider abstraction, tool calling loop and SSE streaming.' },
  { icon: Sparkles, title: 'AI Chat Client', text: 'Streaming Next.js chat UI with tool-call status, retry and mobile support.' },
  { icon: FileCode2, title: 'Docker + Docs', text: 'docker-compose.yml and full README set included - deploy in one command.' },
];

const STEPS = ['Application', 'Authentication', 'AI', 'Discovery', 'Preview', 'Generate', 'Download'];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Zap size={18} aria-hidden="true" />
          </span>
          AI Integration <span className="text-gradient">Generator</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/documentation" className="hidden text-sm text-slate-300 transition hover:text-white sm:block">Docs</Link>
          <Link href="/dashboard" className="text-sm text-slate-300 transition hover:text-white">Dashboard</Link>
          <Link href="/create">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      <header className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pt-24">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300">
          <Sparkles size={13} aria-hidden="true" /> AI + MCP for any existing API
        </p>
        <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Give your application
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"> an AI brain</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-400 sm:text-lg">
          Enter your API details, discover its endpoints, and download a complete project: MCP server, Groq-powered AI server,
          streaming chat client, Docker configuration and documentation.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/create">
            <Button size="lg">
              Generate your integration <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </Link>
          <Link href="/documentation">
            <Button size="lg" variant="secondary" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              Read the docs
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-slate-300">
                {idx + 1}. {step}
              </span>
              {idx < STEPS.length - 1 && <span className="text-slate-600" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-indigo-500/40 hover:bg-white/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-300">
                <feature.icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{feature.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
              <Bot size={14} aria-hidden="true" /> Generated architecture
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300">{`Your App + AiChat.jsx (drop-in component)
     │  SSE streaming
     ▼
AI Server (:4000)
     │  Groq Responses API
     ▼
   Groq ──► MCP Server (:5000)
                 │  API Adapter
                 ▼
           Your API`}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
              <Boxes size={14} aria-hidden="true" /> What you download
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
              <li>✓ <code className="font-mono text-xs text-indigo-300">generated-ai-integration/</code> with all three services</li>
              <li>✓ MCP tools generated from your actual endpoints</li>
              <li>✓ <code className="font-mono text-xs text-indigo-300">docker-compose up</code> to run everything</li>
              <li>✓ Complete documentation + <code className="font-mono text-xs text-indigo-300">.env.example</code> files</li>
              <li>✓ No secrets, no accounts, no lock-in - fully independent project</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        AI + MCP Integration Generator - generated projects are self-contained and portable.
      </footer>
      <div className="pointer-events-none fixed -bottom-32 -left-32 h-72 w-72 rounded-full bg-indigo-600/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -right-32 -top-32 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" aria-hidden="true" />
    </div>
  );
}