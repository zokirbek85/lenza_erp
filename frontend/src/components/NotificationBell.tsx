import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Dropdown, List, notification as antNotification } from 'antd';
import { BellOutlined } from '@ant-design/icons';

import http from '../app/http';
import { formatDate } from '../utils/formatters';
import { useNotificationStore } from '../store/useNotificationStore';

const NotificationBell = () => {
  const { t } = useTranslation();
  const { notifications, unreadCount, setNotifications, clearNotifications } = useNotificationStore();

  const loadNotifications = useCallback(async () => {
    try {
      const response = await http.get('/api/notifications/');
      const items = Array.isArray(response.data) ? response.data : [];
      setNotifications(items);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  }, [setNotifications]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      loadNotifications();
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      const title = typeof detail.title === 'string' ? detail.title : undefined;
      const message = typeof detail.message === 'string' ? detail.message : undefined;
      if (title) {
        antNotification.info({ message: title, description: message });
      }
    };
    window.addEventListener('notifications:refresh', handleRefresh as EventListener);
    return () => window.removeEventListener('notifications:refresh', handleRefresh as EventListener);
  }, [loadNotifications]);

  const markAll = async () => {
    try {
      await http.post('/api/notifications/mark_all/');
      clearNotifications();
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  const dropdownContent = (
    <div className="w-80 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{t('notifications.title')}</span>
        {notifications.length > 0 && (
          <Button type="link" size="small" onClick={markAll}>
            {t('notifications.markAll')}
          </Button>
        )}
      </div>
      <List
        dataSource={notifications}
        locale={{ emptyText: t('notifications.empty') }}
        renderItem={(item) => (
          <List.Item className="px-0">
            <List.Item.Meta
              title={<span className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span>}
              description={
                <div className="text-xs text-slate-500 dark:text-slate-300">
                  <p className="mb-1">{item.message}</p>
                  <span className="text-[10px] uppercase tracking-widest text-slate-400">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Dropdown trigger={['click']} placement="bottomRight" dropdownRender={() => dropdownContent}>
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <BellOutlined className="cursor-pointer text-lg text-slate-600 transition hover:text-slate-900 dark:text-slate-200" />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
