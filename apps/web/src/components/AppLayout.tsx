import { Bell, GitFork, LogOut, Radar, Search, ShieldCheck } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-white/10 bg-ink-950/95 px-5 backdrop-blur">
        <NavLink to="/app" className="flex items-center gap-2 font-semibold text-white">
          <span className="grid h-7 w-7 place-items-center border border-signal-green/40 bg-signal-green/10">
            <ShieldCheck className="h-4 w-4 text-signal-green" />
          </span>
          <span>CodeSentinel</span>
        </NavLink>
        <div className="ml-8 hidden items-center gap-1 text-xs text-slate-500 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-green" />
          Systems operational
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="rounded p-2 text-slate-500 transition hover:bg-white/5 hover:text-white" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button className="rounded p-2 text-slate-500 transition hover:bg-white/5 hover:text-white" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <div className="mx-2 h-5 w-px bg-white/10" />
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-white/10" />
          ) : (
            <GitFork className="h-5 w-5 text-slate-400" />
          )}
          <span className="hidden text-xs font-medium text-slate-300 sm:block">{user?.login}</span>
          <button
            onClick={() => void handleLogout()}
            className="rounded p-2 text-slate-500 transition hover:bg-white/5 hover:text-signal-red"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="fixed bottom-0 left-0 top-14 hidden w-52 border-r border-white/10 bg-ink-900 px-3 py-5 md:block">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Workspace
          </p>
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition ${
                isActive ? 'bg-white/[0.07] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
              }`
            }
          >
            <Radar className="h-4 w-4" />
            Repositories
          </NavLink>
        </aside>
        <main className="min-w-0 flex-1 md:ml-52">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
