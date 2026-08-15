import { useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LandingPage } from '../pages/LandingPage';
import { PullRequestPage } from '../pages/PullRequestPage';
import { RepositoryPage } from '../pages/RepositoryPage';
import { useAuthStore } from '../stores/auth-store';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="repos/:repoId" element={<RepositoryPage />} />
            <Route path="pull-requests/:prId" element={<PullRequestPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function ProtectedRoute() {
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  useEffect(() => {
    if (status === 'idle' || (status === 'authenticated' && !accessToken)) {
      void refreshSession().catch(() => undefined);
    }
  }, [accessToken, refreshSession, status]);

  if (status === 'idle' || status === 'loading' || (status === 'authenticated' && !accessToken)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-mark border-t-transparent" />
          <p className="mt-3 text-xs text-ink-faint">Restoring workspace…</p>
        </div>
      </div>
    );
  }

  return status === 'authenticated' ? <Outlet /> : <Navigate to="/" replace />;
}
