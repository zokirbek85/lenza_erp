import { createBrowserRouter } from 'react-router-dom';
import { RouterErrorBoundary } from '../components/ErrorBoundary';
import NotFound from '../pages/NotFound';
import Guard from '../auth/Guard';
import Layout from '../components/Layout';
import DashboardPage from '../features/dashboard/DashboardPage';
import CurrencyRatesPage from '../pages/CurrencyRates';
import DealersPage from '../pages/Dealers';
import KpiPage from '../pages/KpiPage';
import Login from '../pages/Login';
import OrdersPage from '../pages/Orders';
import ReturnsPage from '../pages/ReturnsPage';
import PaymentsPage from '../pages/Payments';
import ExpensesPage from '../pages/Expenses';
import LedgerPage from '../pages/Ledger';
import ProductsPage from '../pages/Products';
import TwoFactor from '../pages/TwoFactor';
import SettingsPage from '../pages/SettingsPage';
import CompanyCardsPage from '../pages/Settings/CompanyCards';
import UsersPage from '../pages/Users';
import RegionsPage from '../pages/Regions';
import ReconciliationPage from '../features/reconciliation/ReconciliationPage';
import NotificationCenterPage from '../pages/NotificationCenter';
import UserManualPage from '../pages/UserManual';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Guard />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        element: <Layout />, 
        errorElement: <RouterErrorBoundary />,
        children: [
          {
            index: true,
            element: (
              <Guard roles={['admin', 'owner', 'sales']}>
                <DashboardPage />
              </Guard>
            ),
          },
          {
            path: 'orders',
            element: (
              <Guard roles={['admin', 'owner', 'sales', 'warehouse']}>
                <OrdersPage />
              </Guard>
            ),
          },
          {
            path: 'users',
            element: (
              <Guard roles={['admin', 'owner']}>
                <UsersPage />
              </Guard>
            ),
          },
          {
            path: 'regions',
            element: (
              <Guard roles={['admin', 'owner', 'sales']}>
                <RegionsPage />
              </Guard>
            ),
          },
          {
            path: 'products',
            element: (
              <Guard roles={['admin', 'sales', 'warehouse']}>
                <ProductsPage />
              </Guard>
            ),
          },
          {
            path: 'dealers',
            element: (
              <Guard roles={['admin', 'owner', 'sales', 'accountant']}>
                <DealersPage />
              </Guard>
            ),
          },
          {
            path: 'payments',
            element: (
              <Guard roles={['admin', 'owner', 'accountant']}>
                <PaymentsPage />
              </Guard>
            ),
          },
          {
            path: 'expenses',
            element: (
              <Guard roles={['admin', 'owner', 'accountant']}>
                <ExpensesPage />
              </Guard>
            ),
          },
          {
            path: 'ledger',
            element: (
              <Guard roles={['admin', 'owner', 'accountant']}>
                <LedgerPage />
              </Guard>
            ),
          },
          {
            path: 'currency',
            element: (
              <Guard roles={['admin', 'owner', 'accountant']}>
                <CurrencyRatesPage />
              </Guard>
            ),
          },
          {
            path: 'kpi',
            element: (
              <Guard roles={['admin', 'owner']}>
                <KpiPage />
              </Guard>
            ),
          },
          {
            path: 'reconciliation',
            element: (
              <Guard roles={['admin', 'owner', 'sales', 'accountant']}>
                <ReconciliationPage />
              </Guard>
            ),
          },
          {
            path: 'returns',
            element: (
              <Guard roles={['admin', 'owner', 'sales', 'warehouse']}>
                <ReturnsPage />
              </Guard>
            ),
          },
          {
            path: 'settings',
            element: (
              <Guard roles={['admin']}>
                <SettingsPage />
              </Guard>
            ),
          },
          {
            path: 'settings/cards',
            element: (
              <Guard roles={['admin', 'accountant']}>
                <CompanyCardsPage />
              </Guard>
            ),
          },
          {
            path: 'notifications',
            element: (
              <Guard roles={['admin', 'owner', 'sales', 'warehouse', 'accountant']}>
                <NotificationCenterPage />
              </Guard>
            ),
          },
          {
            path: 'manuals',
            element: (
              <Guard roles={['admin', 'owner', 'sales', 'warehouse', 'accountant']}>
                <UserManualPage />
              </Guard>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/2fa',
    element: <TwoFactor />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
