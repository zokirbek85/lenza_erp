import { create } from 'zustand';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  level: string;
  created_at: string;
  type?: string;
  link?: string;
  is_read?: boolean; // Provided by backend serializer; absent means unread
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (items: NotificationItem[]) => void;
  addNotification: (item: NotificationItem) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({
      notifications: items,
      unreadCount: items.filter((i) => !i.is_read).length,
    }),
  addNotification: (item) =>
    set((state) => ({
      notifications: [
        { ...item, is_read: false },
        ...state.notifications,
      ],
      unreadCount: state.unreadCount + 1,
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
}));
