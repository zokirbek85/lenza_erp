import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Dropdown, Empty, List, Drawer, Grid, notification as antNotification } from 'antd';
import { 
  BellOutlined, 
  ShoppingOutlined, 
  DollarOutlined, 
  RollbackOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';

import http from '../app/http';
import { formatDate } from '../utils/formatters';
import { useNotificationStore, type NotificationItem } from '../store/useNotificationStore';

const getNotificationIcon = (type?: string) => {
  switch (type) {
    case 'order':
      return <ShoppingOutlined className="text-blue-500" />;
    case 'payment':
      return <DollarOutlined className="text-green-500" />;
    case 'return':
      return <RollbackOutlined className="text-orange-500" />;
    default:
      return <InfoCircleOutlined className="text-slate-500" />;
  }
};

const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, setNotifications, addNotification, markAllRead } = useNotificationStore();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // md breakpoint and above considered desktop
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      
      // Extract notification data
      const newNotification: NotificationItem = {
        id: typeof detail.id === 'number' ? detail.id : Date.now(),
        title: typeof detail.title === 'string' ? detail.title : 'New notification',
        message: typeof detail.message === 'string' ? detail.message : '',
        level: typeof detail.level === 'string' ? detail.level : 'info',
        created_at: typeof detail.created_at === 'string' ? detail.created_at : new Date().toISOString(),
        type: typeof detail.type === 'string' ? detail.type : undefined,
        link: typeof detail.link === 'string' ? detail.link : undefined,
      };

      // Add to store
      addNotification(newNotification);

      // Show toast notification
      antNotification.info({
        message: newNotification.title,
        description: newNotification.message,
        placement: 'topRight',
        duration: 4,
      });
    };
    
    window.addEventListener('notifications:refresh', handleRefresh as EventListener);
    return () => window.removeEventListener('notifications:refresh', handleRefresh as EventListener);
  }, [addNotification]);

  const markAll = async () => {
    try {
      await http.post('/api/notifications/mark-all-read/');
      markAllRead();
    } catch (error) {
      console.error('Failed to mark notifications as read', error);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (item.link) {
      navigate(item.link);
    }
  };

  const panelContent = (
    <div className="w-96 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-700">
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {t('notifications.title')} {unreadCount > 0 && `(${unreadCount})`}
        </span>
        {notifications.length > 0 && (
          <Button type="link" size="small" onClick={markAll} className="text-xs">
            {t('notifications.markAll')}
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('notifications.empty')}
          className="py-8"
        />
      ) : (
        <List
          dataSource={notifications.slice(0, 10)}
          renderItem={(item) => (
            <List.Item
              className="cursor-pointer rounded-lg px-2 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => handleNotificationClick(item)}
            >
              <List.Item.Meta
                avatar={getNotificationIcon(item.type)}
                title={
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.title} {!item.is_read && <span className="ml-1 rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-600">New</span>}
                  </span>
                }
                description={
                  <div className="text-xs text-slate-600 dark:text-slate-300">
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
      )}
    </div>
  );

  return isMobile ? (
    <>
      <Badge count={unreadCount} size="small" offset={[-4, 4]}>
        <BellOutlined
          onClick={() => setDrawerOpen(true)}
          className="text-xl cursor-pointer text-slate-600 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
        />
      </Badge>
      <Drawer
        placement="right"
        title={
          <div className="flex items-center justify-between">
            <span>{t('notifications.title')} {unreadCount > 0 && `(${unreadCount})`}</span>
            {notifications.length > 0 && (
              <Button size="small" type="link" onClick={markAll}>{t('notifications.markAll')}</Button>
            )}
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {panelContent}
      </Drawer>
    </>
  ) : (
    <Dropdown trigger={['click']} placement="bottomRight" popupRender={() => panelContent}>
      <div className="relative cursor-pointer">
        <Badge count={unreadCount} size="small" offset={[-4, 4]}>
          <BellOutlined className="text-xl text-slate-600 transition hover:text-slate-900 dark:text-slate-200 dark:hover:text-white" />
        </Badge>
      </div>
    </Dropdown>
  );
};

export default NotificationBell;
