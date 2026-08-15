import { ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export function AuthCallbackPage() {
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const error = useAuthStore((state) => state.error);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('ok') !== '1') return;
    void refreshSession()
      .then(() => navigate('/app', { replace: true }))
      .catch(() => undefined);
  }, [navigate, refreshSession, searchParams]);

  return (
    <main className="grid min-h-screen place-items-center bg-ink-950">
      <div className="w-full max-w-sm border border-white/10 bg-ink-900 p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-signal-green" />
        <h1 className="mt-4 text-lg font-semibold text-white">Securing your session</h1>
        {searchParams.get('ok') === '1' && !error ? (
          <>
            <div className="mx-auto mt-5 h-5 w-5 animate-spin rounded-full border-2 border-signal-green border-t-transparent" />
            <p className="mt-3 text-xs text-slate-500">Refreshing credentials and connecting workspace…</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-signal-red">{error ?? 'GitHub authentication did not complete.'}</p>
            <a href="/" className="mt-5 inline-block text-xs font-semibold text-signal-green hover:underline">
              Return to sign in
            </a>
          </>
        )}
      </div>
    </main>
  );
}
