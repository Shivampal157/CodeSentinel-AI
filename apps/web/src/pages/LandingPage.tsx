export function LandingPage() {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative flex flex-col justify-center px-8 py-16 sm:px-12 lg:px-16 xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(227,242,238,0.85),transparent_50%)]" />
        <div className="relative max-w-lg">
          <h1 className="animate-rise font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-ink sm:text-6xl xl:text-7xl">
            CodeSentinel
          </h1>
          <p className="animate-rise-delay mt-6 text-lg leading-relaxed text-ink-muted sm:text-xl">
            Review the change against the rest of the codebase — not just the diff.
          </p>
          <div className="animate-rise-delay-2 mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/api/auth/github';
              }}
              className="btn-primary"
            >
              Continue with GitHub
            </button>
            <span className="text-xs text-ink-faint">Imports only repos you choose.</span>
          </div>
        </div>
      </section>

      <section className="animate-slideIn flex min-h-[52vh] flex-col bg-[#141820] text-white lg:min-h-screen">
        <div className="flex h-12 items-center border-b border-white/10 px-5 font-mono text-[11px] text-white/40">
          auth/session.ts
        </div>
        <div className="flex-1 space-y-0 py-4 font-mono text-[12px] leading-7 sm:text-[13px]">
          <DiffLine n="42" text="const session = await decode(token)" />
          <DiffLine n="43" kind="del" text="return session.user" />
          <DiffLine n="43" kind="add" text="if (!session?.user) throw unauthorized()" />
          <DiffLine n="44" kind="add" text="return session.user" />
        </div>
        <div className="border-t border-white/10 px-5 py-6">
          <p className="font-display text-base font-semibold">Missing session validation</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
            Related call site in middleware/auth.ts assumes a defined user before the route error boundary.
          </p>
        </div>
      </section>
    </main>
  );
}

function DiffLine({
  n,
  text,
  kind,
}: {
  n: string;
  text: string;
  kind?: 'add' | 'del';
}) {
  const tone =
    kind === 'add'
      ? 'bg-[#0D6E5A]/35 text-[#9AE6C8]'
      : kind === 'del'
        ? 'bg-[#B91C1C]/25 text-[#F5A8A8]'
        : 'text-white/70';
  return (
    <div className={`flex ${tone}`}>
      <span className="w-12 shrink-0 select-none pr-3 text-right text-white/25">{n}</span>
      <span className="w-5 shrink-0 select-none opacity-70">{kind === 'add' ? '+' : kind === 'del' ? '−' : ' '}</span>
      <span className="pr-4">{text}</span>
    </div>
  );
}
