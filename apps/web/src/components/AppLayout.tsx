import { LogOut, Radar } from 'lucide-react';
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-paper-line bg-paper-soft/90 px-5 backdrop-blur">
        <NavLink to="/app" className="font-display text-lg font-bold tracking-tight text-ink">
          CodeSentinel
        </NavLink>
        <div className="ml-auto flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-7 w-7 border border-paper-line object-cover" />
          ) : null}
          <span className="hidden text-sm font-medium text-ink-muted sm:block">{user?.login}</span>
          <button
            onClick={() => void handleLogout()}
            className="p-2 text-ink-faint transition hover:text-signal-red"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="fixed bottom-0 left-0 top-14 hidden w-52 border-r border-paper-line bg-paper-soft px-3 py-5 md:block">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            Workspace
          </p>
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 text-sm transition ${
                isActive ? 'bg-mark-soft text-mark-deep' : 'text-ink-muted hover:bg-white hover:text-ink'
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
