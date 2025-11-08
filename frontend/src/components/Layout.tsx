import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../auth/useAuthStore';
import { useGlobalSocket } from '../hooks/useGlobalSocket';
import { usePwa } from '../hooks/usePwa';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { label: 'nav.dashboard', to: '/', roles: ['admin', 'owner', 'sales'] },
  { label: 'nav.users', to: '/users', roles: ['admin', 'owner'] },
  { label: 'nav.regions', to: '/regions', roles: ['admin', 'owner', 'sales'] },
  { label: 'nav.orders', to: '/orders', roles: ['admin', 'owner', 'sales', 'warehouse'] },
  { label: 'nav.products', to: '/products', roles: ['admin', 'sales', 'warehouse'] },
  { label: 'nav.dealers', to: '/dealers', roles: ['admin', 'owner', 'sales', 'accountant'] },
  { label: 'nav.payments', to: '/payments', roles: ['admin', 'owner', 'accountant'] },
  { label: 'nav.currency', to: '/currency', roles: ['admin', 'owner', 'accountant'] },
  { label: 'nav.reconciliation', to: '/reconciliation', roles: ['admin', 'owner', 'sales', 'accountant'] },
  { label: 'nav.kpi', to: '/kpi', roles: ['admin', 'owner'] },
  { label: 'nav.settings', to: '/settings', roles: ['admin'] },
];

const Layout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout, role, userName } = useAuthStore();
  const { offline, canInstall, promptInstall } = usePwa();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('lenza_theme') === 'dark';
  });
  useGlobalSocket();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('lenza_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const visibleItems = useMemo(() => {
    if (!role) {
      return NAV_ITEMS;
    }
    return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={clsx('relative flex min-h-screen text-slate-900 dark:bg-slate-950 dark:text-slate-100')}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#e2e8f0_0%,transparent_60%)] opacity-40 dark:bg-[radial-gradient(circle_at_top,#1e293b_0%,transparent_60%)]" />
      <aside className="relative hidden w-64 flex-shrink-0 border-r border-slate-200/60 bg-white/90 px-4 py-6 dark:border-slate-800/80 dark:bg-slate-900/70 md:flex md:flex-col">
        <div className="mb-8 px-2">
          <p className="text-xl font-semibold">{t('app.title')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">B2B platform</p>
        </div>
        <nav className="flex-1 space-y-1 text-sm font-medium">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-lg px-3 py-2 transition',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 rounded-lg bg-slate-100 px-3 py-2 text-xs uppercase tracking-widest text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          Rol: <span className="font-semibold capitalize text-slate-900 dark:text-white">{role ?? '–'}</span>
        </div>
      </aside>
      <div className="relative flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('app.welcome')} {userName ? `, ${userName}` : ''}
            </p>
            <span className="text-sm text-slate-500 dark:text-slate-400">{t('app.operations')}</span>
            {offline && (
              <span className="mt-1 inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-400/20 dark:text-amber-200">
                Offline mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <LanguageSwitcher />
            <button
              onClick={() => setDarkMode((prev) => !prev)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('app.darkMode')}
            </button>
            {canInstall && (
              <button
                onClick={promptInstall}
                className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-400"
              >
                Install
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-amber-500 dark:text-slate-900 dark:hover:bg-amber-400"
            >
              {t('app.logout')}
            </button>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 text-sm font-medium dark:border-slate-800 dark:bg-slate-900 md:hidden">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'whitespace-nowrap rounded-full px-3 py-1',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'
                )
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </div>
        <main className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-5">
            <p className="absolute -top-10 right-4 text-7xl font-black tracking-wider text-slate-900 dark:text-white">
              Lenza ERP
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
