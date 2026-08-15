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
    <main className="grid min-h-screen place-items-center">
      <div className="surface w-full max-w-sm p-8 text-center">
        <p className="font-display text-xl font-bold text-ink">CodeSentinel</p>
        <h1 className="mt-4 text-base font-semibold text-ink">Securing your session</h1>
        {searchParams.get('ok') === '1' && !error ? (
          <>
            <div className="mx-auto mt-5 h-5 w-5 animate-spin rounded-full border-2 border-mark border-t-transparent" />
            <p className="mt-3 text-xs text-ink-faint">Connecting workspace…</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-signal-red">{error ?? 'GitHub authentication did not complete.'}</p>
            <a href="/" className="mt-5 inline-block text-xs font-semibold text-mark hover:underline">
              Return to sign in
            </a>
          </>
        )}
      </div>
    </main>
  );
}
