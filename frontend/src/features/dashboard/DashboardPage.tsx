import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from 'antd';
import {
  DollarOutlined,
  WalletOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  BoxPlotOutlined,
} from '@ant-design/icons';

import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { loadCache, saveCache } from '../../utils/storage';
import DashboardFilterBar from '../../components/DashboardFilterBar';
import KpiCard from '../../components/KpiCard';
import {
  TopProductsCard,
  TopDealersCard,
  RegionProductHeatmap,
} from '../../components/analytics';
import DebtTrendChart from '../../components/DebtTrendChart';
import PaymentTrendChart from '../../components/PaymentTrendChart';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { DashboardFilters } from '../../store/useDashboardStore';
import type { DashboardSummary } from '../../services/dashboardService';
import {
  fetchDashboardSummary,
  fetchInventoryStats,
  type InventoryStats,
  fetchTopProducts,
  fetchRegionProducts,
  fetchTopDealers,
  type TopProductItem,
  type RegionProductItem,
  type TopDealerItem,
  fetchDebtAnalytics,
} from '../../services/dashboardService';
import type { DebtAnalytics } from '../../types/dashboard';
import './DashboardPage.css';

interface DashboardData {
  summary: DashboardSummary;
  inventoryStats: InventoryStats | null;
  topProducts: TopProductItem[];
  regionProducts: RegionProductItem[];
  topDealers: TopDealerItem[];
  debtAnalytics: DebtAnalytics | null;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const { filters } = useDashboardStore();

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
    inventoryStats: null,
    topProducts: [],
    regionProducts: [],
    topDealers: [],
    debtAnalytics: null,
  });
  const [loading, setLoading] = useState(false);

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

      const [summary, inventory, topProducts, regionProducts, topDealers, debtAnalytics] = await Promise.all([
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
        fetchInventoryStats().catch(() => ({ data: { total_quantity: 0, total_value_usd: 0 } })),
        fetchTopProducts(analyticsFilters).catch(() => ({ data: [] })),
        fetchRegionProducts(analyticsFilters).catch(() => ({ data: [] })),
        fetchTopDealers(analyticsFilters).catch(() => ({ data: [] })),
        fetchDebtAnalytics('daily').catch(() => ({ data: { total_debt: 0, by_dealers: [], by_regions: [], monthly: [], daily: [] } })),
      ]);

      const newData = {
        summary,
        inventoryStats: inventory?.data ?? null,
        topProducts: Array.isArray(topProducts?.data) ? topProducts.data : [],
        regionProducts: Array.isArray(regionProducts?.data) ? regionProducts.data : [],
        topDealers: Array.isArray(topDealers?.data) ? topDealers.data : [],
        debtAnalytics: debtAnalytics?.data ?? null,
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
  }, [filters]);

  // Initial data load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Event listeners for real-time updates
  useEffect(() => {
    const events = ['orders:refresh', 'finance:refresh', 'currency:refresh'];
    const handler = () => void fetchAll();
    events.forEach((event) => window.addEventListener(event, handler));
    return () => events.forEach((event) => window.removeEventListener(event, handler));
  }, [fetchAll]);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <p className="header-label">{t('dashboard.ownerKpi')}</p>
          <h1 className="header-title">{t('nav.dashboard')}</h1>
          <p className="header-subtitle">{t('app.operations')}</p>
        </div>
      </header>

      {/* Filter Bar */}
      <DashboardFilterBar onApply={fetchAll} />

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Row 1: 4 KPI Cards */}
        <div className="dashboard-card kpi-card">
          <KpiCard
            title={t('dashboard.kpi.totalSales')}
            value={data.summary?.total_sales || 0}
            prefix="$"
            precision={2}
            icon={<DollarOutlined className="dashboard-icon" />}
            tooltip={t('dashboard.kpi.salesTooltip')}
            loading={loading}
          />
        </div>

        <div className="dashboard-card kpi-card">
          <KpiCard
            title={t('dashboard.kpi.totalPayments')}
            value={data.summary?.total_payments || 0}
            prefix="$"
            precision={2}
            icon={<WalletOutlined className="dashboard-icon" />}
            tooltip={t('dashboard.kpi.paymentsTooltip')}
            loading={loading}
          />
        </div>

        <div className="dashboard-card kpi-card">
          <KpiCard
            title={t('dashboard.kpi.totalDebt')}
            value={data.summary?.total_debt ?? 0}
            prefix="$"
            precision={2}
            icon={<DollarOutlined className="dashboard-icon" />}
            tooltip={t('dashboard.kpi.debtTooltip')}
            loading={loading}
            valueStyle={{ color: 'var(--error)' }}
          />
        </div>

        <div className="dashboard-card kpi-card">
          <KpiCard
            title={t('dashboard.kpi.dealersCount')}
            value={data.summary?.total_dealers ?? data.summary?.dealers ?? 0}
            precision={0}
            icon={<ShoppingOutlined className="dashboard-icon" />}
            tooltip={t('dashboard.kpi.dealersTooltip')}
            loading={loading}
          />
        </div>

        {/* Row 2: Inventory Card & Payment Chart */}
        <Card className="dashboard-card inventory-card">
          <div className="card-header">
            <BoxPlotOutlined className="dashboard-icon" />
            <h2 className="dashboard-card-title">{t('dashboard.inventory.title')}</h2>
          </div>
          <div className="inventory-content">
            <div className="inventory-stat">
              <p className="stat-label">{t('dashboard.inventory.unit')}</p>
              <p className="stat-value-large">
                {loading ? '...' : formatQuantity(data.summary?.total_stock_good ?? data.inventoryStats?.total_quantity ?? 0)}
              </p>
            </div>
            <div className="inventory-stat">
              <p className="stat-label">{t('dashboard.inventory.totalValue')}</p>
              <p className="stat-value-medium">
                ${loading ? '...' : formatCurrency(data.summary?.total_stock_cost ?? data.inventoryStats?.total_value_usd ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <PaymentTrendChart
          data={data.summary?.revenue_by_month?.map(item => ({
            date: item.month || '',
            amount: item.total || 0,
          })) || []}
          loading={loading}
        />

        {/* Row 3: Top Products - Full Width */}
        <div className="dashboard-card products-card">
          <div className="card-header">
            <TrophyOutlined className="dashboard-icon" />
            <h2 className="dashboard-card-title">{t('dashboard.topProducts')}</h2>
          </div>
          <TopProductsCard data={data.topProducts} loading={loading} />
        </div>

        {/* Row 4: Debt Trend & Region Heatmap - 2 Columns */}
        <div className="debt-card">
          <DebtTrendChart data={data.debtAnalytics?.daily || []} loading={loading} />
        </div>

        <div className="region-card">
          <RegionProductHeatmap data={data.regionProducts} loading={loading} />
        </div>

        {/* Row 5: Top Dealers - Full Width */}
        <div className="dashboard-card dealers-card">
          <TopDealersCard data={data.topDealers} loading={loading} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
