import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col, Card } from 'antd';
import { DollarOutlined, WalletOutlined, ShoppingOutlined } from '@ant-design/icons';

import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { loadCache, saveCache } from '../../utils/storage';
import DashboardFilterBar from '../../components/DashboardFilterBar';
import DashboardTable from '../../components/DashboardTable';
import KpiCard from '../../components/KpiCard';
import DebtByDealerChart from '@/components/DebtByDealerChart';
import DebtByRegionPie from '@/components/DebtByRegionPie';
import DebtTrendChart from '@/components/DebtTrendChart';
import {
  TopProductsCard,
  TopCategoriesCard,
  TopDealersCard,
  ProductTrendLineChart,
  RegionProductHeatmap,
} from '../../components/analytics';
import ExpenseMetrics from '../../components/analytics/ExpenseMetrics';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { DashboardFilters } from '../../store/useDashboardStore';
import { useAuthStore } from '../../auth/useAuthStore';
import type { DashboardSummary } from '../../services/dashboardService';
import type { DebtAnalytics } from '@/types/dashboard';
import {
  fetchDashboardSummary,
  fetchInventoryStats,
  type InventoryStats,
  fetchTopProducts,
  fetchRegionProducts,
  fetchProductTrend,
  fetchTopCategories,
  fetchTopDealers,
  type TopProductItem,
  type RegionProductItem,
  type ProductTrendPeriod,
  type CategoryItem,
  type TopDealerItem,
} from '../../services/dashboardService';
import { fetchDebtAnalytics } from '@/services/dashboard';
import { fetchExpenseSummary, type ExpenseSummary } from '../../api/expensesApi';

interface DashboardData {
  summary: DashboardSummary;
  analytics: DebtAnalytics | null;
  inventoryStats: InventoryStats | null;
  topProducts: TopProductItem[];
  regionProducts: RegionProductItem[];
  productTrend: ProductTrendPeriod[];
  topCategories: CategoryItem[];
  topDealers: TopDealerItem[];
  expenses: ExpenseSummary | null;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const { filters } = useDashboardStore();
  const { role } = useAuthStore();

  const [data, setData] = useState<DashboardData>({
    summary: {
      total_sales: 0,
      total_payments: 0,
      net_profit: 0,
      cash_balance: 0,
      open_orders_count: 0,
      satisfaction_score: 0,
      total_debt: 0,
      total_dealers: 0,
      total_stock_good: 0,
      total_stock_cost: 0,
      dealers: 0,
      overdue_receivables: [],
      revenue_by_month: [],
      revenue_by_product: [],
      inventory_trend: [],
    },
    analytics: null,
    inventoryStats: null,
    topProducts: [],
    regionProducts: [],
    productTrend: [],
    topCategories: [],
    topDealers: [],
    expenses: null,
  });
  const [loading, setLoading] = useState(false);

  const canViewDebtAnalytics = useMemo(() => role !== 'warehouse', [role]);
  const canViewExpenses = useMemo(() => ['admin', 'accountant', 'owner'].includes(role || ''), [role]);

  // Fetch all dashboard data
  const fetchAll = useCallback(async (overrideFilters?: DashboardFilters) => {
    const effectiveFilters = overrideFilters ?? filters;
    setLoading(true);
    try {
      // Build analytics filters from dashboard filters
      const analyticsFilters = {
        start_date: effectiveFilters.dateRange?.[0],
        end_date: effectiveFilters.dateRange?.[1],
        region_id: effectiveFilters.region,
        dealer_id: effectiveFilters.dealers.length === 1 ? effectiveFilters.dealers[0] : undefined,
        categories: effectiveFilters.categories?.length ? effectiveFilters.categories.join(',') : undefined,
      };

      const [summary, analytics, inventory, topProducts, regionProducts, productTrend, topCategories, topDealers, expenses] = await Promise.all([
        fetchDashboardSummary(effectiveFilters).catch(() => ({
          total_sales: 0,
          total_payments: 0,
          net_profit: 0,
          cash_balance: 0,
          open_orders_count: 0,
          satisfaction_score: 0,
          total_debt: 0,
          total_dealers: 0,
          total_stock_good: 0,
          total_stock_cost: 0,
          dealers: 0,
          overdue_receivables: [],
          revenue_by_month: [],
          revenue_by_product: [],
          inventory_trend: [],
        })),
        canViewDebtAnalytics
          ? fetchDebtAnalytics().catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        fetchInventoryStats().catch(() => ({ data: { total_quantity: 0, total_value_usd: 0 } })),
        fetchTopProducts(analyticsFilters).catch(() => ({ data: [] })),
        fetchRegionProducts(analyticsFilters).catch(() => ({ data: [] })),
        fetchProductTrend(analyticsFilters).catch(() => ({ data: [] })),
        fetchTopCategories(analyticsFilters).catch(() => ({ data: [] })),
        fetchTopDealers(analyticsFilters).catch(() => ({ data: [] })),
        canViewExpenses
          ? fetchExpenseSummary(analyticsFilters.start_date, analyticsFilters.end_date).catch(() => null)
          : Promise.resolve(null),
      ]);

      const newData = {
        summary,
        analytics: (analytics?.data as DebtAnalytics | null) ?? null,
        inventoryStats: inventory?.data ?? null,
        topProducts: Array.isArray(topProducts?.data) ? topProducts.data : [],
        regionProducts: Array.isArray(regionProducts?.data) ? regionProducts.data : [],
        productTrend: Array.isArray(productTrend?.data) ? productTrend.data : [],
        topCategories: Array.isArray(topCategories?.data) ? topCategories.data : [],
        topDealers: Array.isArray(topDealers?.data) ? topDealers.data : [],
        expenses: expenses ?? null,
      };

      setData(newData);
      saveCache('dashboard-data', newData);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      // Load from cache on error
      const cached = loadCache<DashboardData>('dashboard-data');
      if (cached) setData(cached);
    } finally {
      setLoading(false);
    }
  }, [filters, canViewDebtAnalytics, canViewExpenses]);

  // Initial data load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Event listeners for real-time updates
  useEffect(() => {
    const events = ['orders:refresh', 'payments:refresh', 'currency:refresh'];
    const handler = () => void fetchAll();
    events.forEach((event) => window.addEventListener(event, handler));
    return () => events.forEach((event) => window.removeEventListener(event, handler));
  }, [fetchAll]);

  return (
    <section className="page-wrapper space-y-8">
      {/* Header */}
      <header>
        <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t('dashboard.ownerKpi')}
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          {t('nav.dashboard')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400">{t('app.operations')}</p>
      </header>

      {/* Filter Bar */}
      <DashboardFilterBar onApply={fetchAll} />

      {/* Primary KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Jami savdolar"
            value={data.summary?.total_sales || 0}
            prefix="$"
            precision={2}
            icon={<DollarOutlined />}
            tooltip="Barcha sotuvlar yig'indisi"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Jami to'lovlar"
            value={data.summary?.total_payments || 0}
            prefix="$"
            precision={2}
            icon={<WalletOutlined />}
            tooltip="Tasdiqlangan to'lovlar"
            loading={loading}
          />
        </Col>
        {canViewDebtAnalytics && (
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Umumiy qarzdorlik"
              value={data.analytics?.total_debt ?? data.summary?.total_debt ?? 0}
              prefix="$"
              precision={2}
              icon={<DollarOutlined />}
              tooltip="Opening + Orders - Payments - Returns"
              loading={loading}
              valueStyle={{ color: '#dc2626' }}
            />
          </Col>
        )}
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Dilerlar soni"
            value={data.summary?.total_dealers ?? data.summary?.dealers ?? 0}
            precision={0}
            icon={<ShoppingOutlined />}
            tooltip="Faol dilerlar"
            loading={loading}
          />
        </Col>
      </Row>

      {/* Inventory Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow" style={{ height: '100%' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.title')}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? '...' : formatQuantity(data.summary?.total_stock_good ?? data.inventoryStats?.total_quantity ?? 0)}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.unit')}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900">
                <ShoppingOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
              </div>
            </div>
            <div className="mt-4 border-t pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.totalValue')}</p>
              <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400">
                ${loading ? '...' : formatCurrency(data.summary?.total_stock_cost ?? data.inventoryStats?.total_value_usd ?? 0)}
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Debt Analytics */}
      {canViewDebtAnalytics && data.analytics && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <DebtByDealerChart data={data.analytics.by_dealers} loading={loading} />
            <DebtByRegionPie data={data.analytics.by_regions} loading={loading} />
          </div>
          <DebtTrendChart data={data.analytics.monthly} loading={loading} />
        </>
      )}

      {/* Expense Analytics */}
      {canViewExpenses && (
        <ExpenseMetrics data={data.expenses} loading={loading} />
      )}

      {/* Sales Analytics Section */}
      <div className="mt-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            📊 {t('Sotuv analitikasi')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('Mahsulotlar, hududlar va dilerlar bo\'yicha batafsil tahlil')}
          </p>
        </div>

        {/* Top Products & Categories */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={16}>
            <TopProductsCard data={data.topProducts} loading={loading} />
          </Col>
          <Col xs={24} lg={8}>
            <TopCategoriesCard data={data.topCategories} loading={loading} />
          </Col>
        </Row>

        {/* Region Products & Product Trend */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={12}>
            <RegionProductHeatmap data={data.regionProducts} loading={loading} />
          </Col>
          <Col xs={24} lg={12}>
            <ProductTrendLineChart data={data.productTrend} loading={loading} />
          </Col>
        </Row>

        {/* Top Dealers */}
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24}>
            <TopDealersCard data={data.topDealers} loading={loading} />
          </Col>
        </Row>
      </div>

      {/* Overdue Receivables Table */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={t('dashboard.overdueReceivables')}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <DashboardTable
              data={Array.isArray(data.summary?.overdue_receivables) ? data.summary.overdue_receivables : []}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default DashboardPage;
