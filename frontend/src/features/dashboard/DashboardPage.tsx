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

import http from '../../app/http';
import { formatCurrency } from '../../utils/formatters';
import { loadCache, saveCache } from '../../utils/storage';

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
  const [ownerData, setOwnerData] = useState<OwnerKpiResponse | null>(null);
  const [salesData, setSalesData] = useState<SalesManagerKPI | null>(null);
  const [accountantData, setAccountantData] = useState<AccountantKPI | null>(null);
  const [currencyHistory, setCurrencyHistory] = useState<CurrencyHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [owner, sales, accountant, currency] = await Promise.all([
        http.get<OwnerKpiResponse>('/api/kpis/owner/'),
        http.get<SalesManagerKPI>('/api/kpis/sales-manager/'),
        http.get<AccountantKPI>('/api/kpis/accountant/'),
        http.get<CurrencyHistory[]>('/api/payments/rates/history/'),
      ]);
      setOwnerData(owner.data);
      setSalesData(sales.data);
      setAccountantData(accountant.data);
      setCurrencyHistory(currency.data);
      saveCache('dashboard-data', {
        owner: owner.data,
        sales: sales.data,
        accountant: accountant.data,
        currency: currency.data,
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

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.ownerKpi')}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {loading ? '...' : formatCurrency(ownerData?.total_sales_usd ?? 0)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('nav.payments')}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {loading ? '...' : formatCurrency(ownerData?.total_payments_usd ?? 0)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.accountantKpi')}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {loading ? '...' : formatCurrency(accountantData?.net_profit_usd ?? 0)}
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.topDealers')}</h2>
            <span className="text-xs uppercase tracking-widest text-slate-400">USD</span>
          </div>
          <div className="h-64">
            {ownerData && ownerData.top_dealers.length > 0 ? (
              <Bar data={topDealerChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.salesTrend')}</h2>
            <span className="text-xs uppercase tracking-widest text-slate-400">USD</span>
          </div>
          <div className="h-64">
            {accountantData ? (
              <Bar data={salesTrendChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.currencyTrend')}</h2>
          <div className="h-64">
            {currencyHistory.length > 0 ? (
              <Line data={currencyTrendChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.balances')}</h2>
          <div className="space-y-3">
            {ownerData && ownerData.balances.length > 0 ? (
              ownerData.balances.slice(0, 5).map((balance) => (
                <div key={balance.dealer} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{balance.dealer}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Balance</p>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
            )}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.salesManagerKpi')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Today</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(salesData?.today_sales_usd ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Average order</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(salesData?.average_order_value_usd ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {salesData && salesData.top_products.length > 0 ? (
              salesData.top_products.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
                >
                  <span>{product.name}</span>
                  <span className="font-semibold">{product.quantity}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
            )}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('dashboard.accountantKpi')}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Outstanding</p>
              <p className="text-xl font-semibold text-rose-500">
                {formatCurrency(accountantData?.outstanding_balance_usd ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">Returns</p>
              <p className="text-xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(accountantData?.returns_total_usd ?? 0)}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};

export default DashboardPage;
