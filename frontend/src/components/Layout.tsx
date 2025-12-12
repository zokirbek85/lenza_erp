import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';

import { useAuthStore } from '../auth/useAuthStore';
import { usePwa } from '../hooks/usePwa';
import { useIsMobile } from '../hooks/useIsMobile';
import { useSidebarStore } from '../store/useSidebarStore';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';
import HeaderAudioPlayer from './HeaderAudioPlayer';
import ThemeToggle from './ThemeToggle';
import Sidebar from './layout/Sidebar';
import Container from './responsive/Container';

const Layout = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { logout, userName } = useAuthStore();
  const { offline, canInstall, promptInstall } = usePwa();
  const { collapsed, setCollapsed, pinned, toggleCollapsed } = useSidebarStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isMobile, isTablet } = useIsMobile();

  useEffect(() => {
    if (pinned) {
      setCollapsed(false);
    }
  }, [pinned, setCollapsed]);

  useEffect(() => {
    if (isMobile || isTablet) {
      setCollapsed(true);
    }
  }, [isMobile, isTablet, setCollapsed]);

  useEffect(() => {
    if (!isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const sidebarWidth = collapsed ? 80 : 260;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleBurger = () => {
    if (isMobile) {
      setDrawerOpen(true);
      return;
    }
    toggleCollapsed();
  };

  const contentMarginLeft = useMemo(() => {
    if (isMobile) return 0;
    if (isTablet) return 80;
    return sidebarWidth;
  }, [isMobile, isTablet, sidebarWidth]);

  const subtitle = userName
    ? t('layout.operationsWithUser', { name: userName, operations: t('app.operations') })
    : t('layout.operationsAnonymous', { operations: t('app.operations') });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0A0E14]">
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobile}
        drawerVisible={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
      />
      <div
        className="relative flex flex-1 flex-col transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: contentMarginLeft }}
      >
        <Container className="flex-1">
          <header className="flex min-h-[64px] flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-[#2A2D30] dark:bg-[#1A1F29]/80">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-lg font-semibold text-slate-900 dark:text-white">
                <button
                  onClick={handleBurger}
                  className="mr-2 rounded-full border border-slate-200 px-3 py-1 text-lg font-semibold text-slate-600 transition hover:border-slate-300 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500"
                  aria-label={t('layout.toggleSidebar')}
                >
                  ☰
                </button>
                {t('app.welcome')}
              </div>
              <span className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</span>
              {offline && (
                <span className="mt-1 inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-400/20 dark:text-amber-200">
                  {t('layout.offlineMode')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <HeaderAudioPlayer />
              <NotificationBell />
              <LanguageSwitcher />
              <ThemeToggle size="middle" />
              {canInstall && (
                <button
                  onClick={promptInstall}
                  className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-400"
                >
                  {t('layout.installApp')}
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

          <main className="flex-1" style={{ minHeight: 'calc(100vh - 64px)' }}>
            <Outlet />
          </main>
        </Container>
      </div>
    </div>
  );
};

export default Layout;
