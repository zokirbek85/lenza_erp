import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col, Card, theme, Button } from 'antd';
import { DownloadOutlined, DollarOutlined, RiseOutlined, WalletOutlined, ShoppingOutlined, SmileOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  type ChartData,
} from 'chart.js';
import { Bar as ChartBar, Line } from 'react-chartjs-2';

import { formatCurrency, formatQuantity } from '../../utils/formatters';
import { loadCache, saveCache } from '../../utils/storage';
import DashboardFilterBar from '../../components/DashboardFilterBar';
import KpiCard from '../../components/KpiCard';
import LedgerBalanceWidget from '../../components/LedgerBalanceWidget';
import { RevenueTrendChart, RevenueSharePie, InventoryTrendLine, ExpensesGauge } from '../../components/DashboardCharts';
import DashboardTable from '../../components/DashboardTable';
import DebtByDealerChart from '@/components/DebtByDealerChart';
import DebtByRegionPie from '@/components/DebtByRegionPie';
import DebtTrendChart from '@/components/DebtTrendChart';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useAuthStore } from '../../auth/useAuthStore';
import type { DashboardSummary } from '../../services/dashboardService';
import type { DebtAnalytics } from '@/types/dashboard';
import {
  fetchDashboardData,
  fetchSalesManagerData,
  fetchAccountantData,
  fetchCurrencyHistory,
  fetchDashboardSummary,
  fetchCardsKpi,
  fetchInventoryStats,
  type InventoryStats,
} from '../../services/dashboardService';
import { fetchDebtAnalytics } from '@/services/dashboard';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ChartTooltip, ChartLegend);

// Type definitions
interface OwnerKpiResponse {
  total_sales_usd: number;
  total_payments_usd: number;
  balances: { dealer: string; balance_usd: number }[];
  top_dealers: { dealer: string; total_usd: number }[];
}

interface SalesManagerKPI {
  today_sales_usd: number;
  current_month_sales_usd: number;
  previous_month_sales_usd: number;
  average_order_value_usd: number;
  top_products: { name: string; quantity: number }[];
}

interface AccountantKPI {
  sales_total_usd: number;
  payments_total_usd: number;
  outstanding_balance_usd: number;
  returns_total_usd: number;
  net_profit_usd: number;
}

interface CurrencyHistory {
  rate_date: string;
  usd_to_uzs: string;
}

interface DashboardData {
  owner: OwnerKpiResponse | null;
  sales: SalesManagerKPI | null;
  accountant: AccountantKPI | null;
  currency: CurrencyHistory[];
  summary: DashboardSummary;
  cardKpi: any[];
  analytics: DebtAnalytics | null;
  inventoryStats: InventoryStats | null;
}

const DashboardPage = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { filters } = useDashboardStore();
  const { role } = useAuthStore();

  // State management
  const [data, setData] = useState<DashboardData>({
    owner: null,
    sales: null,
    accountant: null,
    currency: [],
    summary: {
      total_sales: 0,
      net_profit: 0,
      cash_balance: 0,
      open_orders_count: 0,
      satisfaction_score: 0,
      total_debt_usd: 0,
      dealers: 0,
      overdue_receivables: [],
      revenue_by_month: [],
      revenue_by_product: [],
      inventory_trend: [],
      expenses_vs_budget: { expenses: 0, budget: 100000 },
    },
    cardKpi: [],
    analytics: null,
    inventoryStats: null,
  });
  const [loading, setLoading] = useState(false);

  // Permission checks
  const permissions = useMemo(() => ({
    canLoadOwnerKpi: ['admin', 'owner', 'accountant'].includes(role ?? ''),
    canLoadSalesKpi: ['admin', 'sales'].includes(role ?? ''),
    canLoadAccountantKpi: ['admin', 'accountant'].includes(role ?? ''),
    canLoadCardKpi: ['admin', 'accountant', 'owner'].includes(role ?? ''),
    canViewDebtAnalytics: role !== 'warehouse',
    showCardKpi: ['accountant', 'owner', 'admin'].includes(role ?? ''),
    showLedgerBalance: ['accountant', 'owner'].includes(role ?? ''),
  }), [role]);

  // Fetch all dashboard data
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [owner, sales, accountant, currency, summary, cards, analytics, inventory] = await Promise.all([
        permissions.canLoadOwnerKpi
          ? fetchDashboardData(filters).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        permissions.canLoadSalesKpi
          ? fetchSalesManagerData(filters).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        permissions.canLoadAccountantKpi
          ? fetchAccountantData(filters).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        fetchCurrencyHistory(filters).catch(() => ({ data: [] })),
        fetchDashboardSummary(filters).catch(() => ({
          total_sales: 0,
          net_profit: 0,
          cash_balance: 0,
          open_orders_count: 0,
          satisfaction_score: 0,
          total_debt_usd: 0,
          dealers: 0,
          overdue_receivables: [],
          revenue_by_month: [],
          revenue_by_product: [],
          inventory_trend: [],
          expenses_vs_budget: { expenses: 0, budget: 100000 },
        })),
        permissions.canLoadCardKpi
          ? fetchCardsKpi(filters).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        permissions.canViewDebtAnalytics
          ? fetchDebtAnalytics().catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
        fetchInventoryStats().catch(() => ({ data: { total_quantity: 0, total_value_usd: 0 } })),
      ]);

      const newData = {
        owner: owner?.data ?? null,
        sales: sales?.data ?? null,
        accountant: accountant?.data ?? null,
        currency: currency?.data ?? [],
        summary,
        cardKpi: Array.isArray(cards?.data) ? cards.data : [],
        analytics: (analytics?.data as DebtAnalytics | null) ?? null,
        inventoryStats: inventory?.data ?? null,
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
  };

  // Initial data load
  useEffect(() => {
    fetchAll();
  }, []);

  // Event listeners for real-time updates
  useEffect(() => {
    const events = ['orders:refresh', 'payments:refresh', 'currency:refresh'];
    events.forEach(event => window.addEventListener(event, fetchAll));
    return () => events.forEach(event => window.removeEventListener(event, fetchAll));
  }, []);

  // Chart data builders
  const topDealerChart = useMemo<ChartData<'bar'>>(() => ({
    labels: data.owner?.top_dealers?.map(d => d.dealer) ?? [],
    datasets: [{
      label: t('dashboard.topDealers'),
      data: data.owner?.top_dealers?.map(d => d.total_usd) ?? [],
      backgroundColor: '#0f172a',
    }],
  }), [data.owner, t]);

  const salesTrendChart = useMemo<ChartData<'bar'>>(() => ({
    labels: ['Sales', 'Payments', 'Net profit'],
    datasets: [{
      label: t('dashboard.salesTrend'),
      data: [
        data.accountant?.sales_total_usd ?? 0,
        data.accountant?.payments_total_usd ?? 0,
        data.accountant?.net_profit_usd ?? 0,
      ],
      backgroundColor: ['#0f172a', '#22c55e', '#f97316'],
    }],
  }), [data.accountant, t]);

  const currencyTrendChart = useMemo<ChartData<'line'>>(() => ({
    labels: data.currency.map(rate => rate.rate_date.slice(5)),
    datasets: [{
      label: t('dashboard.currencyTrend'),
      data: data.currency.map(rate => Number(rate.usd_to_uzs)),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56,189,248,0.2)',
      tension: 0.3,
    }],
  }), [data.currency, t]);

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
            value={data.owner?.total_sales_usd || 0}
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
            value={data.owner?.total_payments_usd || 0}
            prefix="$"
            precision={2}
            icon={<WalletOutlined />}
            tooltip="Tasdiqlangan to'lovlar"
            loading={loading}
          />
        </Col>
        {permissions.canViewDebtAnalytics && (
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Umumiy qarzdorlik"
              value={data.analytics?.total_debt ?? data.summary?.total_debt_usd ?? 0}
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
            value={data.summary?.dealers ?? 0}
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
                  {loading ? '...' : formatQuantity(data.inventoryStats?.total_quantity ?? 0)}
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
                ${loading ? '...' : formatCurrency(data.inventoryStats?.total_value_usd ?? 0)}
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Secondary KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Sof foyda"
            value={data.accountant?.net_profit_usd || 0}
            prefix="$"
            precision={2}
            icon={<RiseOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Kassa balansi"
            value={data.owner?.total_payments_usd || 0}
            prefix="$"
            precision={2}
            icon={<WalletOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Ochiq buyurtmalar"
            value={data.summary?.open_orders_count || 0}
            precision={0}
            icon={<ShoppingOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title={t('dashboard.satisfactionScore')}
            value={data.summary?.satisfaction_score || 4.5}
            suffix="/5"
            precision={1}
            icon={<SmileOutlined style={{ fontSize: '24px', color: '#d4af37' }} />}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Debt Analytics */}
      {permissions.canViewDebtAnalytics && data.analytics && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <DebtByDealerChart data={data.analytics.by_dealers} loading={loading} />
            <DebtByRegionPie data={data.analytics.by_regions} loading={loading} />
          </div>
          <DebtTrendChart data={data.analytics.monthly} loading={loading} />
        </>
      )}

      {/* Cards KPI & Top Dealers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {permissions.showCardKpi && (
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-2 flex items-center justify-between">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: token.colorText }}>
                💳 Karta bo'yicha to'lovlar statistikasi
              </h2>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  const params = filters.dateRange?.length === 2
                    ? `?from=${filters.dateRange[0]}&to=${filters.dateRange[1]}`
                    : '';
                  window.open(`/api/reports/cards/pdf/${params}`, '_blank');
                }}
              >
                PDF eksport
              </Button>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              {data.cardKpi.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.cardKpi} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                    <XAxis
                      dataKey="card_name"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fill: token.colorTextSecondary }}
                    />
                    <YAxis tick={{ fill: token.colorTextSecondary }} />
                    <Tooltip
                      contentStyle={{
                        background: token.colorBgElevated,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorder}`,
                        color: token.colorText,
                      }}
                    />
                    <Legend />
                    <defs>
                      <linearGradient id="kpiUsd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00C49F" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#0088FE" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="kpiCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff7300" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#ffbb28" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="total_amount" fill="url(#kpiUsd)" name="To'lov summasi (USD)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="payments_count" fill="url(#kpiCount)" name="To'lovlar soni" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
              )}
            </div>
          </Card>
        )}

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: token.colorText }}>
              {t('dashboard.topDealers')}
            </h2>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>
              USD
            </span>
          </div>
          <div className="h-64">
            {data.owner?.top_dealers && data.owner.top_dealers.length > 0 ? (
              <ChartBar data={topDealerChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: token.colorText }}>
              {t('dashboard.salesTrend')}
            </h2>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>
              USD
            </span>
          </div>
          <div className="h-64">
            {data.accountant ? (
              <ChartBar data={salesTrendChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </Card>
      </div>

      {/* Ledger Balance & Currency Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        {permissions.showLedgerBalance && <LedgerBalanceWidget />}

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>
            {t('dashboard.currencyTrend')}
          </h2>
          <div className="h-64">
            {data.currency.length > 0 ? (
              <Line data={currencyTrendChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>
            {t('dashboard.balances')}
          </h2>
          <div className="space-y-3">
            {data.owner?.balances && data.owner.balances.length > 0 ? (
              data.owner.balances.slice(0, 5).map((balance) => (
                <div key={balance.dealer} className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600, color: token.colorText }}>{balance.dealer}</p>
                    <p style={{ fontSize: '12px', color: token.colorTextSecondary }}>Balance</p>
                  </div>
                  <p
                    className={balance.balance_usd >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                    style={{ fontSize: '14px', fontWeight: 600 }}
                  >
                    {formatCurrency(balance.balance_usd)}
                  </p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </Card>
      </div>

      {/* Sales Manager & Accountant KPIs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>
            {t('dashboard.salesManagerKpi')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>
                Today
              </p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: token.colorText }}>
                {formatCurrency(data.sales?.today_sales_usd ?? 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>
                Average order
              </p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: token.colorText }}>
                {formatCurrency(data.sales?.average_order_value_usd ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {data.sales?.top_products && data.sales.top_products.length > 0 ? (
              data.sales.top_products.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between"
                  style={{ fontSize: '14px', color: token.colorText }}
                >
                  <span>{product.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatQuantity(product.quantity)}</span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>
            {t('dashboard.accountantKpi')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>
                Outstanding
              </p>
              <p className="text-xl font-semibold text-rose-500">
                {formatCurrency(data.accountant?.outstanding_balance_usd ?? 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>
                Returns
              </p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: token.colorText }}>
                {formatCurrency(data.accountant?.returns_total_usd ?? 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.revenueTrend')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <RevenueTrendChart data={data.summary?.revenue_by_month || []} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.revenueShare')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <RevenueSharePie data={data.summary?.revenue_by_product || []} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.inventoryTrend')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <InventoryTrendLine data={data.summary?.inventory_trend || []} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.expensesBudget')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <ExpensesGauge
              expenses={data.summary?.expenses_vs_budget?.expenses || 0}
              budget={data.summary?.expenses_vs_budget?.budget || 100000}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

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
