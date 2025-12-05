import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import http from '../app/http';
import { useAuthStore } from '../auth/useAuthStore';
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

interface Manager {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export default function KPIPage() {
  const { t } = useTranslation('kpi');
  const userId = useAuthStore((state) => state.userId);
  const role = useAuthStore((state) => state.role);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from_date: new Date().getFullYear() + '-01-01',
    to_date: new Date().toISOString().split('T')[0],
  });

  const fetchKPIData = async () => {
    const managerId = role === 'admin' ? selectedManagerId : userId;
    if (!managerId) {
      console.error('Manager ID not available');
      return;
    }
    try {
      setLoading(true);
      const response = await http.get(`/kpi/manager/${managerId}/overview/`, {
        params: dateRange,
      });
      setKpiData(response.data);
    } catch (error) {
      console.error('KPI data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch managers list for admin
  useEffect(() => {
    const fetchManagers = async () => {
      if (role === 'admin') {
        try {
          const response = await http.get('/users/', { params: { role: 'sales' } });
          const salesManagers = response.data.results || response.data;
          setManagers(salesManagers);
          if (salesManagers.length > 0 && !selectedManagerId) {
            setSelectedManagerId(salesManagers[0].id);
          }
        } catch (error) {
          console.error('Failed to fetch managers:', error);
        }
      }
    };
    fetchManagers();
  }, [role]);

  useEffect(() => {
    if (role === 'admin' && !selectedManagerId) return;
    if (role !== 'admin' && !userId) return;
    fetchKPIData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchKPIData, 30000);
    return () => clearInterval(interval);
  }, [dateRange, selectedManagerId]);

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
        <p className="text-gray-500 dark:text-gray-400">{t('noData')}</p>
      </div>
    );
  }

  // Chart data
  const weeklySalesData = {
    labels: kpiData.weekly_sales.map((w) => new Date(w.week).toLocaleDateString()),
    datasets: [
      {
        label: t('weeklySales'),
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
        label: t('monthlyPayments'),
        data: kpiData.monthly_payments.map((m) => m.total_usd),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
      },
    ],
  };

  const regionSalesData = {
    labels: kpiData.sales_by_region.map((r) => r.region),
    datasets: [
      {
        label: t('salesByRegion'),
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
            {t('title')} - {kpiData.manager_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {new Date(kpiData.period_start).toLocaleDateString()} - {new Date(kpiData.period_end).toLocaleDateString()}
          </p>
        </div>
        
        {/* Manager Selector (Admin only) + Date Range Picker */}
        <div className="flex gap-3">
          {role === 'admin' && managers.length > 0 && (
            <select
              value={selectedManagerId || ''}
              onChange={(e) => setSelectedManagerId(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            >
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.first_name} {manager.last_name} ({manager.username})
                </option>
              ))}
            </select>
          )}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalSales')}</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('totalPayments')}</p>
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
              <p className="text-sm text-yellow-100">{t('bonus')} 🎉</p>
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
            <p className="text-xs text-yellow-100">{t('bonusFormula')}: 1% {t('ofPayments')}</p>
          </div>
        </div>

        {/* Dealers Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('dealers')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {kpiData.active_dealers} / {kpiData.total_dealers}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('activeDealers')}</p>
            </div>
            <span className="text-4xl">👥</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Trend */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('weeklySalesTrend')}</h2>
          <Line data={weeklySalesData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Monthly Payments */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('monthlyPaymentsTrend')}</h2>
          <Bar data={monthlyPaymentsData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Region */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('salesByRegion')}</h2>
          {kpiData.sales_by_region.length > 0 ? (
            <Pie data={regionSalesData} options={{ responsive: true, maintainAspectRatio: true }} />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('noRegionData')}</p>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('topProducts')}</h2>
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
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('noProductData')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
