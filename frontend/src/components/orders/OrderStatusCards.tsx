import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import http from '../../app/http';
import toast from 'react-hot-toast';

interface StatusStats {
  created: number;
  confirmed: number;
  packed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

interface OrderStatusCardsProps {
  onStatusClick: (status: string) => void;
  currentFilter?: string;
}

const STATUS_ICONS: Record<string, string> = {
  created: '📝',
  confirmed: '✅',
  packed: '📦',
  shipped: '🚚',
  delivered: '✓',
  cancelled: '❌',
  returned: '↩️',
};

const STATUS_COLORS: Record<string, string> = {
  created: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  confirmed: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
  packed: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
  shipped: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
  delivered: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  cancelled: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  returned: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
};

export default function OrderStatusCards({ onStatusClick, currentFilter }: OrderStatusCardsProps) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<StatusStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await http.get<StatusStats>('/orders/status-stat/');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch order status stats:', error);
      toast.error(t('orders.stats.fetchError', 'Failed to load statistics'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="h-12 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statusEntries = Object.entries(stats) as [keyof StatusStats, number][];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statusEntries.map(([status, count]) => {
        const isActive = currentFilter === status;
        const colorClass = STATUS_COLORS[status] || 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
        const icon = STATUS_ICONS[status] || '📊';

        return (
          <button
            key={status}
            onClick={() => onStatusClick(status)}
            className={`
              group relative rounded-xl border p-4 text-left shadow-sm transition-all
              hover:shadow-md hover:opacity-90
              ${colorClass}
              ${isActive ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}
            `}
            title={t(`orders.status.${status}`, status)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-1 text-2xl">{icon}</div>
                <div className="text-sm font-medium opacity-80">
                  {t(`orders.status.${status}`, status)}
                </div>
                <div className="mt-1 text-2xl font-bold">{count}</div>
              </div>
              {isActive && (
                <div className="absolute right-2 top-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-current"></span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
