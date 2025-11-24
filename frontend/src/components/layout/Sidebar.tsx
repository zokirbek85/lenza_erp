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
  UnorderedListOutlined,
  SettingOutlined,
  WalletOutlined,
  AuditOutlined,
  FileTextOutlined,
  RiseOutlined,
  NotificationOutlined,
  BookOutlined,
  AppstoreOutlined,
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
      path: '/catalog',
      label: 'nav.catalog',
      icon: <AppstoreOutlined />,
      roles: ['admin', 'sales', 'accountant', 'owner'],
    },
    {
      path: '/dealers',
      label: 'nav.dealers',
      icon: <BankOutlined />,
      roles: ['admin', 'sales', 'accountant'],
    },
    {
      path: '/payments',
      label: 'nav.payments',
      icon: <WalletOutlined />,
      roles: ['admin', 'sales', 'accountant'],
    },
    {
      path: '/expenses',
      label: 'nav.expenses',
      icon: <FileTextOutlined />,
      roles: ['admin', 'accountant', 'owner'],
    },
    {
      path: '/ledger',
      label: 'nav.ledger',
      icon: <LineChartOutlined />,
      roles: ['admin', 'accountant', 'owner'],
    },
    {
      path: '/currency',
      label: 'nav.currency',
      icon: <RiseOutlined />,
      roles: ['admin', 'sales', 'accountant'],
    },
    {
      path: '/returns',
      label: 'nav.returns',
      icon: <AuditOutlined />,
      roles: ['admin', 'sales', 'warehouse', 'accountant'],
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
      path: '/expenses/report',
      label: 'nav.expenseReport',
      icon: <LineChartOutlined />,
      roles: ['admin'],
    },
    {
      path: '/expenses/categories',
      label: 'nav.expenseCategories',
      icon: <UnorderedListOutlined />,
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
    <div className="flex h-full flex-col bg-white dark:bg-[#0E1117] shadow-lg">
      <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('app.title')}</p>
        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('app.suite')}</p>
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
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-500 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10'
              )
            }
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
      className="fixed left-0 top-0 z-20 flex h-screen flex-col border-r border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-[#0E1117]"
      style={{ width: collapsed ? 80 : 260 }}
    >
      {renderNav}
    </aside>
  );
};

export default Sidebar;
