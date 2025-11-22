import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Col, Row, Card, theme, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { BarChart as RBarChart, Bar as RBar, XAxis as RXAxis, YAxis as RYAxis, Tooltip as RTooltip, ResponsiveContainer as RResponsiveContainer, Legend as RLegend, CartesianGrid } from 'recharts';
import {
  DollarOutlined,
  RiseOutlined,
  WalletOutlined,
  ShoppingOutlined,
  SmileOutlined,
} from '@ant-design/icons';

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

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

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

const DashboardPage = () => {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { filters } = useDashboardStore();
  const { role } = useAuthStore();
  const [ownerData, setOwnerData] = useState<OwnerKpiResponse | null>(null);
  const [salesData, setSalesData] = useState<SalesManagerKPI | null>(null);
  const [accountantData, setAccountantData] = useState<AccountantKPI | null>(null);
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistory[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardKpi, setCardKpi] = useState<
    Array<{ card_id: number; card_name: string; holder_name: string; total_amount: number; payments_count: number; last_payment_date?: string | null }>
  >([]);
  const [debtAnalytics, setDebtAnalytics] = useState<DebtAnalytics | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);

  const canLoadOwnerKpi = role === 'admin' || role === 'owner' || role === 'accountant';
  const canLoadSalesKpi = role === 'admin' || role === 'sales';
  const canLoadAccountantKpi = role === 'admin' || role === 'accountant';
  const canLoadCardKpi = role === 'admin' || role === 'accountant' || role === 'owner';
  const canViewDebtAnalytics = role !== 'warehouse';

  const fetchAll = async () => {
    setLoading(true);
    try {
      const debtAnalyticsRequest = canViewDebtAnalytics
        ? fetchDebtAnalytics().catch(() => ({ data: null }))
        : Promise.resolve({ data: null });

      const [owner, sales, accountant, currency, summary, cards, analytics, inventory] = await Promise.all([
        canLoadOwnerKpi ? fetchDashboardData(filters) : Promise.resolve({ data: null }),
        canLoadSalesKpi ? fetchSalesManagerData(filters) : Promise.resolve({ data: null }),
        canLoadAccountantKpi ? fetchAccountantData(filters) : Promise.resolve({ data: null }),
        fetchCurrencyHistory(filters).catch(() => ({ data: [] as CurrencyHistory[] })),
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
        canLoadCardKpi ? fetchCardsKpi(filters).catch(() => ({ data: [] as any[] })) : Promise.resolve({ data: [] as any[] }),
        debtAnalyticsRequest,
        fetchInventoryStats().catch(() => ({ data: { total_quantity: 0, total_value_usd: 0 } })),
      ]);
      setOwnerData(owner?.data ?? null);
      setSalesData(sales?.data ?? null);
      setAccountantData(accountant?.data ?? null);
      setCurrencyHistory(currency?.data ?? []);
      setDashboardData(summary);
      const normalizedCards = Array.isArray(cards?.data) ? (cards?.data as any) : [];
      setCardKpi(normalizedCards);
      setDebtAnalytics((analytics?.data as DebtAnalytics | null) ?? null);
      setInventoryStats(inventory?.data ?? null);
      saveCache('dashboard-data', {
        owner: owner?.data ?? null,
        sales: sales?.data ?? null,
        accountant: accountant?.data ?? null,
        currency: currency?.data ?? [],
        summary,
        cardKpi: normalizedCards,
        analytics: (analytics?.data as DebtAnalytics | null) ?? null,
        inventoryStats: inventory?.data ?? null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll().catch(() => {
      const cached = loadCache<{
        owner: OwnerKpiResponse | null;
        sales: SalesManagerKPI | null;
        accountant: AccountantKPI | null;
        currency: CurrencyHistory[] | null;
        cardKpi: any[] | null;
        summary: DashboardSummary | null;
        analytics: DebtAnalytics | null;
        inventoryStats: InventoryStats | null;
      }>('dashboard-data');
      if (cached) {
        setOwnerData(cached.owner);
        setSalesData(cached.sales);
        setAccountantData(cached.accountant);
        setCurrencyHistory(cached.currency || []);
        setCardKpi(cached.cardKpi || []);
        setDashboardData(cached.summary ?? null);
        setDebtAnalytics(cached.analytics ?? null);
        setInventoryStats(cached.inventoryStats ?? null);
      }
    });
  }, []);

  useEffect(() => {
    const refresh = () => fetchAll();
    window.addEventListener('orders:refresh', refresh);
    window.addEventListener('payments:refresh', refresh);
    window.addEventListener('currency:refresh', refresh);
    return () => {
      window.removeEventListener('orders:refresh', refresh);
      window.removeEventListener('payments:refresh', refresh);
      window.removeEventListener('currency:refresh', refresh);
    };
  }, []);

  const topDealerChart = useMemo<ChartData<'bar'>>(
    () => ({
      labels: ownerData?.top_dealers.map((dealer) => dealer.dealer) ?? [],
      datasets: [
        {
          label: t('dashboard.topDealers'),
          data: ownerData?.top_dealers.map((dealer) => dealer.total_usd) ?? [],
          backgroundColor: '#0f172a',
        },
      ],
    }),
    [ownerData, t]
  );

  const showCardKpi = role === 'accountant' || role === 'owner' || role === 'admin';
  const showDebtAnalytics = canViewDebtAnalytics && Boolean(debtAnalytics);

  const salesTrendChart = useMemo<ChartData<'bar'>>(
    () => ({
      labels: ['Sales', 'Payments', 'Net profit'],
      datasets: [
        {
          label: t('dashboard.salesTrend'),
          data: [
            accountantData?.sales_total_usd ?? 0,
            accountantData?.payments_total_usd ?? 0,
            accountantData?.net_profit_usd ?? 0,
          ],
          backgroundColor: ['#0f172a', '#22c55e', '#f97316'],
        },
      ],
    }),
    [accountantData, t]
  );

  const currencyTrendChart = useMemo<ChartData<'line'>>(
    () => ({
      labels: currencyHistory.map((rate) => rate.rate_date.slice(5)),
      datasets: [
        {
          label: t('dashboard.currencyTrend'),
          data: currencyHistory.map((rate) => Number(rate.usd_to_uzs)),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56,189,248,0.2)',
          tension: 0.3,
        },
      ],
    }),
    [currencyHistory, t]
  );

  return (
    <section className="page-wrapper space-y-8">
      <header>
        <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('dashboard.ownerKpi')}</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{t('nav.dashboard')}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t('app.operations')}</p>
      </header>

      <DashboardFilterBar onApply={fetchAll} />

            <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Jami savdolar"
            value={ownerData?.total_sales_usd || 0}
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
            value={ownerData?.total_payments_usd || 0}
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
              value={debtAnalytics?.total_debt ?? dashboardData?.total_debt_usd ?? 0}
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
            value={dashboardData?.dealers ?? 0}
            precision={0}
            icon={<ShoppingOutlined />}
            tooltip="Faol dilerlar"
            loading={loading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="shadow-sm hover:shadow-md transition-shadow" style={{ height: '100%' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.inventory.title')}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? '...' : formatQuantity(inventoryStats?.total_quantity ?? 0)}
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
                ${loading ? '...' : formatCurrency(inventoryStats?.total_value_usd ?? 0)}
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Sof foyda"
            value={accountantData?.net_profit_usd || 0}
            prefix="$"
            precision={2}
            icon={<RiseOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Kassa balansi"
            value={ownerData?.total_payments_usd || 0}
            prefix="$"
            precision={2}
            icon={<WalletOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Ochiq buyurtmalar"
            value={dashboardData?.open_orders_count || 0}
            precision={0}
            icon={<ShoppingOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title={t('dashboard.satisfactionScore')}
            value={dashboardData?.satisfaction_score || 4.5}
            suffix="/5"
            precision={1}
            icon={<SmileOutlined style={{ fontSize: '24px', color: '#d4af37' }} />}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Old KPI Cards (keeping for now) */}
      <div className="grid gap-4 md:grid-cols-3">
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>{t('dashboard.ownerKpi')}</p>
          <p style={{ marginTop: '8px', fontSize: '30px', fontWeight: 600, color: token.colorText }}>
            {loading ? '...' : formatCurrency(ownerData?.total_sales_usd ?? 0)}
          </p>
        </article>
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>{t('nav.payments')}</p>
          <p style={{ marginTop: '8px', fontSize: '30px', fontWeight: 600, color: token.colorText }}>
            {loading ? '...' : formatCurrency(ownerData?.total_payments_usd ?? 0)}
          </p>
        </article>
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>{t('dashboard.accountantKpi')}</p>
          <p style={{ marginTop: '8px', fontSize: '30px', fontWeight: 600, color: token.colorText }}>
            {loading ? '...' : formatCurrency(accountantData?.net_profit_usd ?? 0)}
          </p>
        </article>
      </div>

      {showDebtAnalytics && debtAnalytics && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <DebtByDealerChart data={debtAnalytics.by_dealers} loading={loading} />
            <DebtByRegionPie data={debtAnalytics.by_regions} loading={loading} />
          </div>
          <DebtTrendChart data={debtAnalytics.monthly} loading={loading} />
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {showCardKpi && (
          <article style={{ 
            borderRadius: '16px', 
            padding: '24px',
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
          }}>
            <div className="mb-2 flex items-center justify-between">
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: token.colorText }}>💳 Karta bo‘yicha to‘lovlar statistikasi</h2>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  const params = filters.dateRange && filters.dateRange.length === 2
                    ? `?from=${filters.dateRange[0]}&to=${filters.dateRange[1]}`
                    : '';
                  window.open(`/api/reports/cards/pdf/${params}`, '_blank');
                }}
              >
                PDF eksport
              </Button>
            </div>
            <div style={{ width: '100%', height: 320 }}>
              {cardKpi && cardKpi.length > 0 ? (
                <RResponsiveContainer width="100%" height="100%">
                  <RBarChart data={cardKpi} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                    <RXAxis
                      dataKey="card_name"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tick={{ fill: token.colorTextSecondary }}
                    />
                    <RYAxis tick={{ fill: token.colorTextSecondary }} />
                    <RTooltip
                      contentStyle={{
                        background: token.colorBgElevated,
                        borderRadius: 8,
                        border: `1px solid ${token.colorBorder}`,
                        color: token.colorText,
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'total_amount') return [`$${Number(value).toLocaleString()}`, 'Summa'];
                        if (name === 'payments_count') return [value, "To‘lovlar soni"];
                        return [value, name];
                      }}
                      labelFormatter={(label: string, payload: any) => {
                        const p = Array.isArray(payload) && payload[0] ? payload[0].payload : null;
                        return p ? `${p.card_name} — ${p.holder_name}` : label;
                      }}
                    />
                    <RLegend />
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
                    <RBar dataKey="total_amount" fill="url(#kpiUsd)" name="To‘lov summasi (USD)" radius={[6,6,0,0]} />
                    <RBar dataKey="payments_count" fill="url(#kpiCount)" name="To‘lovlar soni" radius={[6,6,0,0]} yAxisId={1 as any} />
                  </RBarChart>
                </RResponsiveContainer>
              ) : (
                <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
              )}
            </div>
          </article>
        )}
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: token.colorText }}>{t('dashboard.topDealers')}</h2>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>USD</span>
          </div>
          <div className="h-64">
            {ownerData && ownerData.top_dealers.length > 0 ? (
              <Bar data={topDealerChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </article>
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: token.colorText }}>{t('dashboard.salesTrend')}</h2>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>USD</span>
          </div>
          <div className="h-64">
            {accountantData ? (
              <Bar data={salesTrendChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(role === 'accountant' || role === 'owner') && (
          <LedgerBalanceWidget />
        )}
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>{t('dashboard.currencyTrend')}</h2>
          <div className="h-64">
            {currencyHistory.length > 0 ? (
              <Line data={currencyTrendChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </article>
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>{t('dashboard.balances')}</h2>
          <div className="space-y-3">
            {ownerData && ownerData.balances.length > 0 ? (
              ownerData.balances.slice(0, 5).map((balance) => (
                <div key={balance.dealer} className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600, color: token.colorText }}>{balance.dealer}</p>
                    <p style={{ fontSize: '12px', color: token.colorTextSecondary }}>Balance</p>
                  </div>
                  <p
                    className={clsx(
                      balance.balance_usd >= 0 ? 'text-emerald-500' : 'text-rose-500',
                      'text-sm font-semibold'
                    )}
                  >
                    {formatCurrency(balance.balance_usd)}
                  </p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '14px', color: token.colorTextSecondary }}>—</p>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>{t('dashboard.salesManagerKpi')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>Today</p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: token.colorText }}>
                {formatCurrency(salesData?.today_sales_usd ?? 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>Average order</p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: token.colorText }}>
                {formatCurrency(salesData?.average_order_value_usd ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {salesData && salesData.top_products.length > 0 ? (
              salesData.top_products.map((product) => (
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
        </article>
        <article style={{ 
          borderRadius: '16px', 
          padding: '24px',
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorder}`,
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600, color: token.colorText }}>{t('dashboard.accountantKpi')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>Outstanding</p>
              <p className="text-xl font-semibold text-rose-500">
                {formatCurrency(accountantData?.outstanding_balance_usd ?? 0)}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: token.colorTextTertiary }}>Returns</p>
              <p style={{ fontSize: '20px', fontWeight: 600, color: token.colorText }}>
                {formatCurrency(accountantData?.returns_total_usd ?? 0)}
              </p>
            </div>
          </div>
        </article>
      </div>

      {/* Charts Section */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} lg={12}>
          <Card 
            title={t('dashboard.revenueTrend')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <RevenueTrendChart 
              data={dashboardData?.revenue_by_month || []} 
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={t('dashboard.revenueShare')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <RevenueSharePie 
              data={dashboardData?.revenue_by_product || []} 
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={t('dashboard.inventoryTrend')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <InventoryTrendLine 
              data={dashboardData?.inventory_trend || []} 
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={t('dashboard.expensesBudget')}
            className="shadow-sm hover:shadow-md transition-shadow"
            styles={{ body: { padding: '16px' } }}
          >
            <ExpensesGauge 
              expenses={dashboardData?.expenses_vs_budget?.expenses || 0}
              budget={dashboardData?.expenses_vs_budget?.budget || 100000}
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
              data={dashboardData?.overdue_receivables || []} 
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default DashboardPage;
