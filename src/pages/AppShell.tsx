import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../core/authStore';
import { navFor } from './paths';

const ICONS: Record<string, string> = {
  '/trip': 'M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  '/analysis': 'M5 20V11 M12 20V4 M19 20v-6',
  '/dashboard':
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5 M16.5 5.2a3 3 0 0 1 0 5.6 M18 14.7c1.8.7 3 2.5 3 5.3',
  '/link':
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5 M16.5 5.2a3 3 0 0 1 0 5.6 M18 14.7c1.8.7 3 2.5 3 5.3',
};

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const loading = useAuthStore((s) => s.loading);
  const signOut = useAuthStore((s) => s.signOut);

  if (loading) return <p className="p-6 text-center text-sm text-gray-600">Loading...</p>;
  if (!user || !role) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[1100] flex items-center justify-between bg-ink-800 px-4 py-3 text-white">
        <span className="flex items-center gap-2">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffb703" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
            <path d="M12 9v5" />
          </svg>
          <span className="font-board text-xl font-semibold tracking-tight">TransitGuard</span>
        </span>
        <span className="flex items-center gap-3 text-sm">
          <span className="rounded-sm bg-board-400 px-2 py-0.5 font-board text-sm font-semibold capitalize text-ink-900">
            {role}
          </span>
          <button onClick={() => void signOut()} className="text-white/75 hover:text-white hover:underline">
            Sign out
          </button>
        </span>
      </header>

      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* z-[1100] keeps the nav above the Leaflet map panes; the alert overlay (9999) stays above both */}
      <nav className="fixed inset-x-0 bottom-0 z-[1100] flex border-t bg-white pb-[env(safe-area-inset-bottom)]">
        {navFor(role).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-xs ${
                isActive ? 'font-semibold text-black' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`absolute inset-x-6 top-0 h-0.5 ${isActive ? 'bg-board-400' : 'bg-transparent'}`} />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ICONS[item.to] ?? ICONS['/trip']} />
                </svg>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}