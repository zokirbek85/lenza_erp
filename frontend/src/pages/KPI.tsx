import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import http from '../app/http';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
// Icons replaced with Unicode emojis for lightweight bundle

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface KPIData {
  manager_id: number;
  manager_name: string;
  total_sales_usd: number;
  total_sales_uzs: number;
  total_payments_usd: number;
  total_payments_uzs: number;
  bonus_usd: number;
  bonus_uzs: number;
  period_start: string;
  period_end: string;
  sales_by_region: Array<{ region: string; total_usd: number }>;
  top_products: Array<{ product_name: string; product_sku: string; quantity: number; total_amount: number }>;
  weekly_sales: Array<{ week: string; total_usd: number }>;
  monthly_payments: Array<{ month: string; total_usd: number }>;
  total_dealers: number;
  active_dealers: number;
}

export default function KPIPage() {
  const { t } = useTranslation();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from_date: new Date().getFullYear() + '-01-01',
    to_date: new Date().toISOString().split('T')[0],
  });

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await http.get(`/kpi/manager/${user.id}/overview/`, {
        params: dateRange,
      });
      setKpiData(response.data);
    } catch (error) {
      console.error('KPI data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchKPIData, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 dark:text-gray-400">{t('kpi.noData')}</p>
      </div>
    );
  }

  // Chart data
  const weeklySalesData = {
    labels: kpiData.weekly_sales.map((w) => new Date(w.week).toLocaleDateString()),
    datasets: [
      {
        label: t('kpi.weeklySales'),
        data: kpiData.weekly_sales.map((w) => w.total_usd),
        borderColor: 'rgb(234, 179, 8)',
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const monthlyPaymentsData = {
    labels: kpiData.monthly_payments.map((m) => new Date(m.month).toLocaleDateString('default', { month: 'short' })),
    datasets: [
      {
        label: t('kpi.monthlyPayments'),
        data: kpiData.monthly_payments.map((m) => m.total_usd),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
      },
    ],
  };

  const regionSalesData = {
    labels: kpiData.sales_by_region.map((r) => r.region),
    datasets: [
      {
        label: t('kpi.salesByRegion'),
        data: kpiData.sales_by_region.map((r) => r.total_usd),
        backgroundColor: [
          'rgba(234, 179, 8, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(168, 85, 247, 0.7)',
        ],
      },
    ],
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            {t('kpi.title')} - {kpiData.manager_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {new Date(kpiData.period_start).toLocaleDateString()} - {new Date(kpiData.period_end).toLocaleDateString()}
          </p>
        </div>
        
        {/* Date Range Picker */}
        <div className="flex gap-3">
          <input
            type="date"
            value={dateRange.from_date}
            onChange={(e) => setDateRange({ ...dateRange, from_date: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
          />
          <input
            type="date"
            value={dateRange.to_date}
            onChange={(e) => setDateRange({ ...dateRange, to_date: e.target.value })}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('kpi.totalSales')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ${kpiData.total_sales_usd.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {kpiData.total_sales_uzs.toLocaleString()} {t('currency.uzs')}
              </p>
            </div>
            <span className="text-4xl">📈</span>
          </div>
        </div>

        {/* Payments Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('kpi.totalPayments')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ${kpiData.total_payments_usd.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {kpiData.total_payments_uzs.toLocaleString()} {t('currency.uzs')}
              </p>
            </div>
            <span className="text-4xl">💵</span>
          </div>
        </div>

        {/* Bonus Card - Gold Accent */}
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 p-6 rounded-xl shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-100">{t('kpi.bonus')} 🎉</p>
              <p className="text-3xl font-black text-white">
                ${kpiData.bonus_usd.toLocaleString()}
              </p>
              <p className="text-xs text-yellow-100 mt-1">
                {kpiData.bonus_uzs.toLocaleString()} {t('currency.uzs')}
              </p>
            </div>
            <span className="text-5xl animate-pulse">🏆</span>
          </div>
          <div className="mt-3 pt-3 border-t border-yellow-300">
            <p className="text-xs text-yellow-100">{t('kpi.bonusFormula')}: 1% {t('kpi.ofPayments')}</p>
          </div>
        </div>

        {/* Dealers Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('kpi.dealers')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {kpiData.active_dealers} / {kpiData.total_dealers}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('kpi.activeDealers')}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('kpi.weeklySalesTrend')}</h2>
          <Line data={weeklySalesData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Monthly Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('kpi.monthlyPaymentsTrend')}</h2>
          <Bar data={monthlyPaymentsData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Region */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('kpi.salesByRegion')}</h2>
          {kpiData.sales_by_region.length > 0 ? (
            <Pie data={regionSalesData} options={{ responsive: true, maintainAspectRatio: true }} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('kpi.noRegionData')}</p>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('kpi.topProducts')}</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {kpiData.top_products.map((product, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{product.product_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.product_sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800 dark:text-white">{product.quantity} {t('units')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">${product.total_amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {kpiData.top_products.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('kpi.noProductData')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
