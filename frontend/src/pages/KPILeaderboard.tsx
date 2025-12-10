import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import http from '../app/http';
// Icons replaced with Unicode emojis for lightweight bundle

interface LeaderboardItem {
  manager_id: number;
  manager_name: string;
  total_sales_usd: number;
  total_payments_usd: number;
  bonus_usd: number;
  dealer_count: number;
  rank: number;
}

interface LeaderboardData {
  period_start: string;
  period_end: string;
  managers: LeaderboardItem[];
}

export default function KPILeaderboard() {
  const { t } = useTranslation('kpi');
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to get current month's first day
  const getCurrentMonthRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      from_date: firstDay.toISOString().split('T')[0],
      to_date: today.toISOString().split('T')[0],
    };
  };
  
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await http.get('/kpi/leaderboard/', {
        params: dateRange,
      });
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.managers.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500 dark:text-gray-400">{t('noData')}</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-4xl">🥇</span>;
      case 2:
        return <span className="text-4xl">🥈</span>;
      case 3:
        return <span className="text-4xl">🥉</span>;
      default:
        return <span className="text-2xl font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-br from-amber-600 to-amber-800';
      default:
        return 'bg-white dark:bg-gray-800';
    }
  };

  const getRankTextColor = (rank: number) => {
    if (rank <= 3) return 'text-white';
    return 'text-gray-800 dark:text-white';
  };

  const top3 = leaderboard.managers.slice(0, 3);
  const others = leaderboard.managers.slice(3);

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            🏆 {t('leaderboard.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {new Date(leaderboard.period_start).toLocaleDateString()} -{' '}
            {new Date(leaderboard.period_end).toLocaleDateString()}
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

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {top3.map((manager) => (
          <div
            key={manager.manager_id}
            className={`${getRankBgColor(manager.rank)} ${getRankTextColor(manager.rank)} p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300`}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Rank Icon */}
              <div className="mb-2">{getRankIcon(manager.rank)}</div>

              {/* Manager Name */}
              <h2 className="text-2xl font-black">{manager.manager_name}</h2>

              {/* Stats */}
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-90">{t('leaderboard.sales')}:</span>
                  <span className="font-bold">${manager.total_sales_usd.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-90">{t('leaderboard.payments')}:</span>
                  <span className="font-bold">${manager.total_payments_usd.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/30">
                  <span className="text-sm opacity-90">{t('leaderboard.bonus')}:</span>
                  <span className="font-black text-xl">${manager.bonus_usd.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm opacity-90">{t('leaderboard.dealers')}:</span>
                  <span className="font-bold">{manager.dealer_count}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Others Table */}
      {others.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('leaderboard.allManagers')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('leaderboard.rank')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('leaderboard.manager')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('leaderboard.sales')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('leaderboard.payments')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('leaderboard.bonus')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('leaderboard.dealers')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {others.map((manager) => (
                  <tr
                    key={manager.manager_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-600 dark:text-gray-300">#{manager.rank}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-800 dark:text-white">{manager.manager_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-gray-800 dark:text-white">${manager.total_sales_usd.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-gray-800 dark:text-white">${manager.total_payments_usd.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">
                        ${manager.bonus_usd.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-gray-800 dark:text-white">{manager.dealer_count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">👥</span>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-300">{t('leaderboard.totalManagers')}</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-white">{leaderboard.managers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900 p-6 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💵</span>
            <div>
              <p className="text-sm text-green-600 dark:text-green-300">{t('leaderboard.totalSales')}</p>
              <p className="text-2xl font-bold text-green-800 dark:text-white">
                ${leaderboard.managers.reduce((sum, m) => sum + m.total_sales_usd, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900 p-6 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-300">{t('leaderboard.totalPayments')}</p>
              <p className="text-2xl font-bold text-purple-800 dark:text-white">
                ${leaderboard.managers.reduce((sum, m) => sum + m.total_payments_usd, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900 p-6 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-sm text-yellow-600 dark:text-yellow-300">{t('leaderboard.totalBonus')}</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-white">
                ${leaderboard.managers.reduce((sum, m) => sum + m.bonus_usd, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
