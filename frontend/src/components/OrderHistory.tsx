import { useEffect, useState } from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import http from '../app/http';

interface StatusLog {
  id: number;
  old_status: string | null;
  new_status: string;
  by_user: string | null;
  at: string;
}

interface OrderHistoryProps {
  orderId: number;
}

const STATUS_BADGE_MAP: Record<string, string> = {
  created: 'badge badge-info',
  confirmed: 'badge badge-blue',
  packed: 'badge badge-blue',
  shipped: 'badge badge-blue',
  delivered: 'badge badge-success',
  cancelled: 'badge badge-error',
  returned: 'badge badge-warning',
};

export const OrderHistory = ({ orderId }: OrderHistoryProps) => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await http.get(`/orders/${orderId}/history/`);
        setLogs(response.data);
      } catch (err) {
        console.error('Failed to fetch order history:', err);
        setError(t('orders.history.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [orderId, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-8">
        <div className="spinner" />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t('common:messages.loading')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-red-900 dark:text-red-200">
              {t('common:messages.error')}
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="card border-dashed text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('orders.history.noHistory')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeInUp">
      <h5 className="text-lg font-semibold text-slate-900 dark:text-white">
        {t('orders.history.title')}
      </h5>
      
      <div className="card overflow-x-auto">
        <table className="modern-table">
          <thead>
            <tr>
              <th className="w-1/4">{t('orders.history.oldStatus')}</th>
              <th className="w-1/4">{t('orders.history.newStatus')}</th>
              <th className="w-1/4">{t('orders.history.changedBy')}</th>
              <th className="w-1/4">{t('orders.history.changedAt')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const oldBadgeClass = log.old_status 
                ? STATUS_BADGE_MAP[log.old_status] || 'badge badge-info'
                : 'badge badge-info';
              const newBadgeClass = STATUS_BADGE_MAP[log.new_status] || 'badge badge-blue';
              
              const date = new Date(log.at);
              const formattedDate = date.toLocaleString();

              return (
                <tr key={log.id}>
                  <td>
                    {log.old_status ? (
                      <span className={oldBadgeClass}>
                        {t(`orders.status.${log.old_status}`, { defaultValue: log.old_status })}
                      </span>
                    ) : (
                      <span className="badge badge-info">
                        {t('orders.history.initialCreation')}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={newBadgeClass}>
                      {t(`orders.status.${log.new_status}`, { defaultValue: log.new_status })}
                    </span>
                  </td>
                  <td className="text-slate-700 dark:text-slate-300">
                    {log.by_user || t('orders.history.system')}
                  </td>
                  <td className="text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <ClockCircleOutlined className="text-slate-400" />
                      <span>{formattedDate}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderHistory;