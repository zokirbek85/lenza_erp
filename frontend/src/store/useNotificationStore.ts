import { create } from 'zustand';

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  level: string;
  created_at: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (items: NotificationItem[]) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({
      notifications: items,
      unreadCount: items.length,
    }),
  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),
}));
