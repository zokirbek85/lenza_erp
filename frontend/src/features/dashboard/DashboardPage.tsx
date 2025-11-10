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
import { Col, Row, Card, theme } from 'antd';
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
import { RevenueTrendChart, RevenueSharePie, InventoryTrendLine, ExpensesGauge } from '../../components/DashboardCharts';
import DashboardTable from '../../components/DashboardTable';
import { useDashboardStore } from '../../store/useDashboardStore';
import type { DashboardSummary } from '../../services/dashboardService';
import {
  fetchDashboardData,
  fetchSalesManagerData,
  fetchAccountantData,
  fetchCurrencyHistory,
  fetchDashboardSummary,
} from '../../services/dashboardService';

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
  const [ownerData, setOwnerData] = useState<OwnerKpiResponse | null>(null);
  const [salesData, setSalesData] = useState<SalesManagerKPI | null>(null);
  const [accountantData, setAccountantData] = useState<AccountantKPI | null>(null);
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistory[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [owner, sales, accountant, currency, summary] = await Promise.all([
        fetchDashboardData(filters),
        fetchSalesManagerData(filters),
        fetchAccountantData(filters),
        fetchCurrencyHistory(filters),
        fetchDashboardSummary(filters).catch(() => ({
          total_sales: 0,
          net_profit: 0,
          cash_balance: 0,
          open_orders_count: 0,
          satisfaction_score: 0,
          overdue_receivables: [],
          revenue_by_month: [],
          revenue_by_product: [],
          inventory_trend: [],
          expenses_vs_budget: { expenses: 0, budget: 100000 },
        })),
      ]);
      setOwnerData(owner.data);
      setSalesData(sales.data);
      setAccountantData(accountant.data);
      setCurrencyHistory(currency.data);
      setDashboardData(summary);
      saveCache('dashboard-data', {
        owner: owner.data,
        sales: sales.data,
        accountant: accountant.data,
        currency: currency.data,
        summary,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll().catch(() => {
      const cached = loadCache<{
        owner: OwnerKpiResponse;
        sales: SalesManagerKPI;
        accountant: AccountantKPI;
        currency: CurrencyHistory[];
      }>('dashboard-data');
      if (cached) {
        setOwnerData(cached.owner);
        setSalesData(cached.sales);
        setAccountantData(cached.accountant);
        setCurrencyHistory(cached.currency);
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
    <section className="space-y-8">
      <header>
        <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">{t('dashboard.ownerKpi')}</p>
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{t('nav.dashboard')}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t('app.operations')}</p>
      </header>

      <DashboardFilterBar onApply={fetchAll} />

      {/* New KPI Cards Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Jami Daromad"
            value={ownerData?.total_sales_usd || 0}
            prefix="$"
            precision={2}
            change={12.5}
            tooltip="Umumiy sotish hajmi — eng muhim moliyaviy ko'rsatkich"
            icon={<DollarOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Sof Foyda"
            value={accountantData?.net_profit_usd || 0}
            prefix="$"
            precision={2}
            change={8.3}
            tooltip="Kompaniyaning haqiqiy rentabelligini baholaydi"
            icon={<RiseOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Kassa Balansi"
            value={ownerData?.total_payments_usd || 0}
            prefix="$"
            precision={2}
            change={-2.1}
            tooltip="Likvidlik va barqarorlikni baholaydi"
            icon={<WalletOutlined />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Ochiq Buyurtmalar"
            value={25}
            precision={0}
            tooltip="Operatsion yuklamani baholaydi"
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
            tooltip={t('dashboard.satisfactionScore')}
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

      <div className="grid gap-6 lg:grid-cols-2">
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
