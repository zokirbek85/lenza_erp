import clsx from 'clsx';
import { Drawer } from 'antd';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/useAuthStore';
import { useTheme } from '../../context/ThemeContext';

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
} from '@ant-design/icons';

type MenuItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
};

const MENU_CONFIG: Record<string, MenuItem[]> = {
  admin: [
    { label: 'nav.dashboard', to: '/', icon: <DashboardOutlined /> },
    { label: 'nav.users', to: '/users', icon: <TeamOutlined /> },
    { label: 'nav.regions', to: '/regions', icon: <AuditOutlined /> },
    { label: 'nav.orders', to: '/orders', icon: <ShoppingOutlined /> },
    { label: 'nav.products', to: '/products', icon: <ShopOutlined /> },
    { label: 'nav.dealers', to: '/dealers', icon: <BankOutlined /> },
    { label: 'nav.payments', to: '/payments', icon: <WalletOutlined /> },
    { label: 'nav.expenses', to: '/expenses', icon: <FileTextOutlined /> },
    { label: 'nav.expenseReport', to: '/expenses/report', icon: <LineChartOutlined /> },
    { label: 'nav.expenseCategories', to: '/expenses/categories', icon: <UnorderedListOutlined /> },
    { label: 'nav.ledger', to: '/ledger', icon: <LineChartOutlined /> },
    { label: 'nav.currency', to: '/currency', icon: <RiseOutlined /> },
    { label: 'nav.returns', to: '/returns', icon: <AuditOutlined /> },
    { label: 'nav.reconciliation', to: '/reconciliation', icon: <AuditOutlined /> },
    { label: 'nav.kpi', to: '/kpi', icon: <LineChartOutlined /> },
    { label: 'nav.settings', to: '/settings', icon: <SettingOutlined /> },
    { label: 'nav.notifications', to: '/notifications', icon: <NotificationOutlined /> },
    { label: 'nav.userManual', to: '/manuals', icon: <BookOutlined /> },
  ],
  owner: [
    { label: 'nav.dashboard', to: '/', icon: <DashboardOutlined /> },
    { label: 'nav.orders', to: '/orders', icon: <ShoppingOutlined /> },
    { label: 'nav.dealers', to: '/dealers', icon: <BankOutlined /> },
    { label: 'nav.payments', to: '/payments', icon: <WalletOutlined /> },
    { label: 'nav.expenses', to: '/expenses', icon: <FileTextOutlined /> },
    { label: 'nav.kpi', to: '/kpi', icon: <LineChartOutlined /> },
    { label: 'nav.notifications', to: '/notifications', icon: <NotificationOutlined /> },
  ],
  sales: [
    { label: 'nav.dashboard', to: '/', icon: <DashboardOutlined /> },
    { label: 'nav.orders', to: '/orders', icon: <ShoppingOutlined /> },
    { label: 'nav.dealers', to: '/dealers', icon: <BankOutlined /> },
    { label: 'nav.kpi', to: '/kpi', icon: <LineChartOutlined /> },
    { label: 'nav.currency', to: '/currency', icon: <RiseOutlined /> },
  ],
  warehouse: [
    { label: 'nav.orders', to: '/orders', icon: <ShoppingOutlined /> },
    { label: 'nav.returns', to: '/returns', icon: <AuditOutlined /> },
    { label: 'nav.currency', to: '/currency', icon: <RiseOutlined /> },
  ],
  accountant: [
    { label: 'nav.dashboard', to: '/', icon: <DashboardOutlined /> },
    { label: 'nav.payments', to: '/payments', icon: <WalletOutlined /> },
    { label: 'nav.expenses', to: '/expenses', icon: <FileTextOutlined /> },
    { label: 'nav.expenseReport', to: '/expenses/report', icon: <LineChartOutlined /> },
    { label: 'nav.ledger', to: '/ledger', icon: <LineChartOutlined /> },
    { label: 'nav.currency', to: '/currency', icon: <RiseOutlined /> },
  ],
};

const DEFAULT_MENU = MENU_CONFIG.admin;

type SidebarProps = {
  collapsed: boolean;
  isMobile: boolean;
  drawerVisible: boolean;
  onDrawerClose: () => void;
};

const Sidebar = ({ collapsed, isMobile, drawerVisible, onDrawerClose }: SidebarProps) => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const { mode } = useTheme();
  const items = MENU_CONFIG[role as keyof typeof MENU_CONFIG] ?? DEFAULT_MENU;

  const renderNav = (
    <div className="flex h-full flex-col bg-white dark:bg-[#0E1117] shadow-lg">
      <div className="border-b border-slate-200 px-4 py-5 dark:border-slate-800">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('app.title')}</p>
        <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">ERP Suite</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
            <span className={clsx(collapsed && 'hidden')}>{t(item.label)}</span>
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
