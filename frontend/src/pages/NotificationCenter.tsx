import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ConfigProvider, Divider, Empty, List, Pagination, Segmented, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import http from '../app/http';
import NotificationItem from '../components/NotificationItem';

interface ApiNotificationItem {
  id: number;
  title: string;
  message: string;
  level: string;
  created_at: string;
  is_read?: boolean;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const PAGE_SIZE = 20;

export default function NotificationCenterPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<ApiNotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const navigate = useNavigate();

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await http.get('/notifications/', {
        params: { page: p, page_size: PAGE_SIZE },
      });
      const payload = (res.data?.results ? res.data : { results: res.data, count: Array.isArray(res.data) ? res.data.length : 0 }) as Paginated<ApiNotificationItem>;
      setItems(payload.results ?? []);
      setTotal(payload.count ?? (payload.results?.length ?? 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page]);

  const onMarkAll = async () => {
    await http.post('/notifications/mark-all-read/');
    // Optimistically mark local state as read
    setItems((prev) => prev.map((it) => ({ ...it, is_read: true })));
  };

  const resolveLink = (title: string): string => {
    const lower = title.toLowerCase();
    if (lower.includes('buyurtma') || lower.includes('order')) return '/orders';
    if (lower.includes("to'lov") || lower.includes('payment')) return '/payments';
    if (lower.includes('qaytar') || lower.includes('return')) return '/returns';
    if (lower.includes('kurs') || lower.includes('currency')) return '/settings';
    return '/';
  };

  return (
    <ConfigProvider>
      <div className="mx-auto w-full max-w-4xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <Typography.Title level={3} style={{ margin: 0 }}>
            {t('notifications.title')}
          </Typography.Title>
          <div className="flex items-center gap-2">
            <Button onClick={() => load(page)}>{t('common:actions.refresh')}</Button>
            <Button type="primary" onClick={onMarkAll}>
              {t('notifications.markAllRead')}
            </Button>
          </div>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <Segmented
            options={[
              { label: t('notifications.filters.all'), value: 'all' },
              { label: t('notifications.filters.unread'), value: 'unread' },
              { label: t('notifications.filters.read'), value: 'read' },
            ]}
            value={filter}
            onChange={(val) => setFilter(val as 'all' | 'unread' | 'read')}
          />
          <div className="text-xs text-slate-500">
            {t('notifications.stats.total')}: {total} вЂў {t('notifications.stats.unread')}: {items.filter(i => !i.is_read).length}
          </div>
        </div>
        <Divider style={{ margin: '8px 0 16px' }} />
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description={t('notifications.noNotifications')} />
        ) : (
          <List
            itemLayout="vertical"
            dataSource={items.filter((it) =>
              filter === 'all' ? true : filter === 'unread' ? !it.is_read : !!it.is_read
            )}
            renderItem={(item) => (
              <List.Item key={item.id} className="px-0">
                <NotificationItem
                  id={item.id}
                  title={item.title}
                  message={item.message}
                  created_at={item.created_at}
                  is_read={item.is_read}
                  onClick={() => navigate(resolveLink(item.title))}
                />
              </List.Item>
            )}
          />
        )}
        <div className="mt-4 flex items-center justify-center">
          <Pagination current={page} onChange={setPage} total={total} pageSize={PAGE_SIZE} showSizeChanger={false} />
        </div>
      </div>
    </ConfigProvider>
  );
}

