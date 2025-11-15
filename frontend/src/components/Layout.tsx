import clsx from 'clsx';
import { Grid } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../auth/useAuthStore';
import { usePwa } from '../hooks/usePwa';
import { useSidebarStore } from '../store/useSidebarStore';
import { useTheme } from '../context/ThemeContext';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import Sidebar from './layout/Sidebar';

const { useBreakpoint } = Grid;

const Layout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout, userName } = useAuthStore();
  const { offline, canInstall, promptInstall } = usePwa();
  const { collapsed, setCollapsed, pinned, setPinned } = useSidebarStore();
  const { mode, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (pinned) {
      setCollapsed(false);
    }
  }, [pinned, setCollapsed]);

  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const sidebarWidth = collapsed ? 80 : 260;
  const layoutMarginLeft = isMobile ? 0 : sidebarWidth;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleBurger = () => {
    if (isMobile) {
      setDrawerOpen(true);
      return;
    }
    setCollapsed((prev) => !prev);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        drawerVisible={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />
      <div
        className="relative flex flex-1 flex-col transition-all duration-300"
        style={{ marginLeft: layoutMarginLeft }}
      >
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-lg font-semibold text-slate-900 dark:text-white">
              <button
                onClick={handleBurger}
                className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-lg font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                aria-label="Toggle sidebar"
              >
                ☰
              </button>
              {t('app.welcome')}
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {userName ? `, ${userName}` : ''} · {t('app.operations')}
            </span>
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
              onClick={toggleTheme}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {mode === 'dark' ? '☀️ Light' : '🌙 Dark'}
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
