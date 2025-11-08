import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

import http from '../app/http';

type SystemNotification = {
  id: number;
  title: string;
  message: string;
  level: string;
  created_at: string;
};

const NotificationBell = () => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [open, setOpen] = useState(false);

  const loadNotifications = async () => {
    const response = await http.get<SystemNotification[]>('/notifications/');
    setNotifications(response.data);
  };

  useEffect(() => {
    loadNotifications();
    const refresh = () => loadNotifications();
    window.addEventListener('notifications:refresh', refresh);
    return () => window.removeEventListener('notifications:refresh', refresh);
  }, []);

  const unreadCount = notifications.length;

  const markAll = async () => {
    await http.post('/notifications/mark_all/');
    setNotifications([]);
  };

  const modal = open ? (
    createPortal(
      <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
        <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('app.operations')}</h2>
            <button className="text-sm text-emerald-500" onClick={markAll}>
              Mark all
            </button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <article key={notification.id} className="rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{notification.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-9.33-4.928" />
          <path d="M6.67 6.07A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 1 1-6 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {modal}
    </>
  );
};

export default NotificationBell;
