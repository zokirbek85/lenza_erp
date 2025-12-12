import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Drawer } from 'antd';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/useAuthStore';
import type { UserRole } from '../../auth/useAuthStore';
import type { AppRole } from '../../auth/routeAccess';
import { rolesForPath } from '../../auth/routeAccess';

import {
  DashboardOutlined,
  TeamOutlined,
  BankOutlined,
  ShopOutlined,
  ShoppingOutlined,
  LineChartOutlined,
  SettingOutlined,
  AuditOutlined,
  FileTextOutlined,
  RiseOutlined,
  NotificationOutlined,
  BookOutlined,
  AppstoreOutlined,
  DollarOutlined,
  FolderOutlined,
  ToolOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

export interface MenuItem {
  path: string;
  label: string;
  icon?: ReactNode;
  roles?: UserRole[];
}

const BASE_MENU: MenuItem[] = [
    {
      path: '/',
      label: 'nav.dashboard',
      icon: <DashboardOutlined />,
      roles: ['admin', 'accountant', 'owner'],
    },
    {
      path: '/kpi',
      label: 'nav.kpi',
      icon: <LineChartOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant', 'owner'],
    },
    {
      path: '/kpi/leaderboard',
      label: 'nav.kpiLeaderboard',
      icon: <RiseOutlined />,
      roles: ['admin'],
    },
    {
      path: '/kpi/manager',
      label: 'nav.kpiManager',
      icon: <TeamOutlined />,
      roles: ['admin'],
    },
    {
      path: '/orders',
      label: 'nav.orders',
      icon: <ShoppingOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant'],
    },
    {
      path: '/products',
      label: 'nav.products',
      icon: <ShopOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant'],
    },
    {
      path: '/products/variants',
      label: 'nav.productVariants',
      icon: <AppstoreOutlined />,
      roles: ['admin'],
    },
    {
      path: '/catalog',
      label: 'nav.catalog',
      icon: <AppstoreOutlined />,
      roles: ['admin', 'sales', 'accountant', 'owner'],
    },
    {
      path: '/marketing/documents',
      label: 'nav.marketing',
      icon: <FileTextOutlined />,
      roles: ['admin', 'sales', 'owner'],
    },
    {
      path: '/dealers',
      label: 'nav.dealers',
      icon: <BankOutlined />,
      roles: ['admin', 'sales', 'accountant'],
    },
    {
      path: '/currency',
      label: 'nav.currency',
      icon: <RiseOutlined />,
      roles: ['admin', 'sales', 'accountant'],
    },
    {
      path: '/finance',
      label: 'nav.finance',
      icon: <DollarOutlined />,
      roles: ['admin', 'accountant', 'owner'],
    },
    {
      path: '/finance/categories',
      label: 'nav.expenseCategories',
      icon: <FolderOutlined />,
      roles: ['admin', 'accountant', 'owner'],
    },
    {
      path: '/returns',
      label: 'nav.returns',
      icon: <AuditOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant'],
    },
    {
      path: '/defects',
      label: 'nav.defects',
      icon: <ToolOutlined />,
      roles: ['admin', 'warehouse'],
    },
    {
      path: '/defects/analytics',
      label: 'nav.defectAnalytics',
      icon: <BarChartOutlined />,
      roles: ['admin', 'warehouse', 'owner'],
    },
    {
      path: '/reconciliation',
      label: 'nav.reconciliation',
      icon: <AuditOutlined />,
      roles: ['admin', 'sales', 'accountant'],
    },
    {
      path: '/notifications',
      label: 'nav.notifications',
      icon: <NotificationOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant'],
    },
    {
      path: '/manuals',
      label: 'nav.userManual',
      icon: <BookOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant', 'owner'],
    },
    {
      path: '/users',
      label: 'nav.users',
      icon: <TeamOutlined />,
      roles: ['admin'],
    },
    {
      path: '/regions',
      label: 'nav.regions',
      icon: <AuditOutlined />,
      roles: ['admin'],
    },
    {
      path: '/settings',
      label: 'nav.settings',
      icon: <SettingOutlined />,
      roles: ['admin'],
    },
];

const MENU: MenuItem[] = BASE_MENU.map((item) => ({
  ...item,
  roles: item.roles ?? rolesForPath(item.path),
}));

type SidebarProps = {
  collapsed: boolean;
  isMobile: boolean;
  drawerVisible: boolean;
  onDrawerClose: () => void;
};

const Sidebar = ({ collapsed, isMobile, drawerVisible, onDrawerClose }: SidebarProps) => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role as AppRole | null);
  const menuItems = role ? MENU.filter((item) => item.roles?.includes(role)) : [];

  // Force full-width sidebar in mobile drawer mode - always show text labels
  const isCollapsed = isMobile ? false : collapsed;

  const renderNav = (
    <div className="flex h-full flex-col shadow-lg" style={{ backgroundColor: 'var(--bg-body)' }}>
      <div className={clsx("px-4 py-5 transition-all duration-300", isCollapsed ? "flex justify-center" : "")} style={{ borderBottom: '1px solid var(--border-base)' }}>
        <div className={clsx("flex items-center gap-3", !isCollapsed && "mb-2")}>
          <img 
            src="/logo-lenza.svg" 
            alt="Lenza" 
            className={clsx("w-auto transition-all duration-300", isCollapsed ? "h-8" : "h-10")}
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <p className="text-lg font-semibold font-heading" style={{ color: 'var(--text-primary)' }}>{t('app.title')}</p>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{t('app.suite')}</p>
            </div>
          )}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200',
                isActive
                  ? 'border-l-4'
                  : ''
              )
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? 'var(--lenza-gold-light)' : 'transparent',
              color: isActive ? 'var(--lenza-gold)' : 'var(--text-secondary)',
              borderLeftColor: isActive ? 'var(--lenza-gold)' : 'transparent',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('border-l-4')) {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.classList.contains('border-l-4')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span className="text-lg">{item.icon}</span>
            <span className={clsx(isCollapsed && 'hidden')}>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer
        open={drawerVisible}
        onClose={onDrawerClose}
        placement="left"
        width={260}
    styles={{
      body: { padding: 0 },
    }}
        className="md:hidden"
      >
        {renderNav}
      </Drawer>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 z-20 flex h-screen flex-col shadow-lg"
      style={{ 
        width: collapsed ? 80 : 260,
        backgroundColor: 'var(--bg-body)',
        borderRight: '1px solid var(--border-base)',
      }}
    >
      {renderNav}
    </aside>
  );
};

export default Sidebar;