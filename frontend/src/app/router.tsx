import { createBrowserRouter } from 'react-router-dom';
import { RouterErrorBoundary } from '../components/ErrorBoundary';
import NotFound from '../pages/NotFound';
import Layout from '../components/Layout';
import DashboardPage from '../features/dashboard/DashboardPage';
import CurrencyRatesPage from '../pages/CurrencyRates';
import DealersPage from '../pages/Dealers';

import KpiPage from '../pages/KpiPage';
import OwnerKpiPage from '../pages/kpi/OwnerKpiPage';
import WarehouseKpiPage from '../pages/kpi/WarehouseKpiPage';
import KPIPage from '../pages/KPI'; // New comprehensive KPI module
import KPILeaderboard from '../pages/KPILeaderboard'; // Leaderboard for directors
import Login from '../pages/Login';
import OrdersPage from '../pages/Orders';
import ReturnsPage from '../pages/ReturnsPage';
import ReturnEditPage from '../pages/returns/ReturnEditPage';
import ProductsPage from '../pages/Products';
import CatalogPage from '../pages/Catalog';
import TwoFactor from '../pages/TwoFactor';
import SettingsPage from '../pages/SettingsPage';
import CompanyCardsPage from '../pages/Settings/CompanyCards';
import UsersPage from '../pages/Users';
import RegionsPage from '../pages/Regions';
import ReconciliationPage from '../features/reconciliation/ReconciliationPage';
import NotificationCenterPage from '../pages/NotificationCenter';
import UserManualPage from '../pages/UserManual';
import Unauthorized from '../pages/Unauthorized';
import DocumentGeneratorPage from '../pages/marketing/DocumentGenerator';
import VerifyOrderPage from '../pages/verify/VerifyOrderPage';
import VerifyReconciliationPage from '../pages/verify/VerifyReconciliationPage';
import FinanceDashboard from '../pages/FinanceDashboard';
import FinanceTransactions from '../pages/FinanceTransactions';
import ProtectedRoute from '../auth/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute roles={['admin', 'accountant', 'owner']}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'warehouse', 'accountant']}>
            <OrdersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute roles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'regions',
        element: (
          <ProtectedRoute roles={['admin']}>
            <RegionsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'products',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'warehouse', 'accountant']}>
            <ProductsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'catalog',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'accountant', 'owner']}>
            <CatalogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'marketing/documents',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'owner']}>
            <DocumentGeneratorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dealers',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'accountant']}>
            <DealersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'currency',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'accountant']}>
            <CurrencyRatesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kpi',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'warehouse', 'accountant', 'owner']}>
            <KpiPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kpi/owner',
        element: (
          <ProtectedRoute roles={['admin', 'accountant', 'owner']}>
            <OwnerKpiPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kpi/manager',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'owner']}>
            <KPIPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kpi/warehouse',
        element: (
          <ProtectedRoute roles={['admin', 'warehouse']}>
            <WarehouseKpiPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'kpi/leaderboard',
        element: (
          <ProtectedRoute roles={['admin', 'owner']}>
            <KPILeaderboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reconciliation',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'accountant']}>
            <ReconciliationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'returns',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'warehouse', 'accountant']}>
            <ReturnsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'returns/:id/edit',
        element: (
          <ProtectedRoute roles={['admin']}>
            <ReturnEditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute roles={['admin']}>
            <SettingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings/cards',
        element: (
          <ProtectedRoute roles={['admin', 'accountant']}>
            <CompanyCardsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'warehouse', 'accountant']}>
            <NotificationCenterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'manuals',
        element: (
          <ProtectedRoute roles={['admin', 'sales', 'warehouse', 'accountant', 'owner']}>
            <UserManualPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <ProtectedRoute roles={['admin', 'accountant', 'owner']}>
            <FinanceDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/transactions',
        element: (
          <ProtectedRoute roles={['admin', 'accountant']}>
            <FinanceTransactions />
          </ProtectedRoute>
        ),
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
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '/verify/order/:id',
    element: <VerifyOrderPage />,
  },
  {
    path: '/verify/reconciliation/:id',
    element: <VerifyReconciliationPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
