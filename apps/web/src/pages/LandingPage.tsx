import { ArrowRight, Braces, GitPullRequest, GitFork, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../lib/api';

export function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-950 text-slate-200">
      <nav className="mx-auto flex h-16 max-w-6xl items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-2 font-semibold text-white">
          <span className="grid h-8 w-8 place-items-center border border-signal-green/40 bg-signal-green/10">
            <ShieldCheck className="h-4 w-4 text-signal-green" />
          </span>
          CodeSentinel
        </div>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">Engineering intelligence</span>
      </nav>
      <section className="mx-auto grid max-w-6xl gap-16 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-36">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
            Context-aware pull request review
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-6xl">
            Review the change.
            <br />
            Understand the system.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-400">
            CodeSentinel indexes your codebase, reviews pull requests with repository-wide context, and tracks technical debt as it evolves.
          </p>
          <button
            onClick={() => {
              window.location.href = `${getApiBaseUrl()}/api/auth/github`;
            }}
            className="mt-10 inline-flex h-11 items-center gap-3 bg-signal-green px-5 text-sm font-semibold text-ink-950 transition hover:bg-emerald-300"
          >
            <GitFork className="h-4 w-4" />
            Continue with GitHub
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 text-[11px] text-slate-600">Read access to repositories you choose to import.</p>
        </div>
        <div className="relative">
          <div className="absolute -inset-px bg-gradient-to-b from-white/15 to-transparent" />
          <div className="relative border border-white/10 bg-ink-900 shadow-2xl shadow-black/40">
            <div className="flex h-10 items-center border-b border-white/10 px-3">
              <span className="font-mono text-[10px] text-slate-500">pull/184 · auth/session.ts</span>
              <span className="ml-auto border border-signal-red/20 bg-signal-red/10 px-2 py-0.5 text-[9px] font-bold uppercase text-signal-red">
                High
              </span>
            </div>
            <div className="space-y-px bg-white/[0.04] font-mono text-[11px] leading-6">
              <CodeLine number="42" mark=" " text="const session = await decode(token)" />
              <CodeLine number="43" mark="-" text="return session.user" tone="red" />
              <CodeLine number="43" mark="+" text="if (!session?.user) throw unauthorized()" tone="green" />
              <CodeLine number="44" mark="+" text="return session.user" tone="green" />
            </div>
            <div className="border-t border-white/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-signal-amber" />
                Missing session validation
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                The caller at <span className="font-mono text-slate-400">middleware/auth.ts:28</span> assumes a defined user and can throw before the route error boundary.
              </p>
              <div className="mt-4 flex gap-4 border-t border-white/[0.07] pt-3 text-[10px] uppercase tracking-wider text-slate-600">
                <span className="flex items-center gap-1.5"><Braces className="h-3 w-3" /> 14 files indexed</span>
                <span className="flex items-center gap-1.5"><GitPullRequest className="h-3 w-3" /> debt +3</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CodeLine({ number, mark, text, tone }: { number: string; mark: string; text: string; tone?: 'red' | 'green' }) {
  return (
    <div className={tone === 'red' ? 'bg-signal-red/10' : tone === 'green' ? 'bg-signal-green/10' : 'bg-ink-900'}>
      <span className="inline-block w-10 select-none border-r border-white/[0.05] pr-2 text-right text-slate-700">{number}</span>
      <span className={tone === 'red' ? 'px-3 text-signal-red' : tone === 'green' ? 'px-3 text-signal-green' : 'px-3 text-slate-500'}>{mark}</span>
      <span className="text-slate-400">{text}</span>
    </div>
  );
}
