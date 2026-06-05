import { create } from 'zustand';
import type { Notification, NotificationChannel, NotificationType } from '../api/types';
import {
  getNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  markAsUnread as apiMarkAsUnread,
  deleteNotification as apiDeleteNotification
} from '../api/service';

type NotificationState = {
  notifications: Notification[];
  bellNotifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  page: number;
  totalPages: number;
  total: number;
  activeType: string | null;
  showUnreadOnly: boolean;

  fetchNotifications: (params?: { page?: number; pageSize?: number; type?: NotificationType; channel?: NotificationChannel; unreadOnly?: boolean }) => Promise<void>;
  fetchBellNotifications: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  setActiveType: (type: NotificationType | null) => void;
  setShowUnreadOnly: (show: boolean) => void;
  setPage: (page: number) => void;
};

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  bellNotifications: [],
  unreadCount: 0,
  isLoading: false,
  page: 1,
  totalPages: 1,
  total: 0,
  activeType: null,
  showUnreadOnly: false,

  fetchNotifications: async (params) => {
    set({ isLoading: true });
    try {
      const state = get();
      const response = await getNotifications({
        page: params?.page ?? state.page,
        pageSize: params?.pageSize ?? 20,
        type: params?.type ?? ((state.activeType as NotificationType | null) ?? undefined),
        channel: params?.channel,
        unreadOnly: params?.unreadOnly ?? state.showUnreadOnly
      });
      set({
        notifications: response.items,
        total: response.total,
        page: response.page,
        totalPages: response.totalPages,
        isLoading: false
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchBellNotifications: async (params) => {
    try {
      const response = await getNotifications({
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 5,
        channel: 'in_app'
      });
      set({ bellNotifications: response.items });
    } catch {
      // Silently fail
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await getUnreadCount();
      set({ unreadCount: response.count });
    } catch {
      // Silently fail
    }
  },

  markAsRead: async (id) => {
    try {
      await apiMarkAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        ),
        bellNotifications: state.bellNotifications.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      }));
      void get().fetchUnreadCount();
    } catch {
      // Silently fail
    }
  },

  markAsUnread: async (id) => {
    try {
      await apiMarkAsUnread(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, readAt: null } : n
        ),
        bellNotifications: state.bellNotifications.map((n) =>
          n.id === id ? { ...n, readAt: null } : n
        )
      }));
      void get().fetchUnreadCount();
    } catch {
      // Silently fail
    }
  },

  markAllAsRead: async () => {
    try {
      await apiMarkAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          readAt: n.channel === 'in_app' ? (n.readAt ?? new Date().toISOString()) : n.readAt
        })),
        bellNotifications: state.bellNotifications.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString()
        }))
      }));
      void get().fetchUnreadCount();
    } catch {
      // Silently fail
    }
  },

  removeNotification: async (id) => {
    try {
      await apiDeleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        bellNotifications: state.bellNotifications.filter((n) => n.id !== id),
        total: state.total - 1
      }));
    } catch {
      // Silently fail
    }
  },

  setActiveType: (type) => {
    set({ activeType: type, page: 1 });
    get().fetchNotifications({ page: 1, type: type ?? undefined });
  },

  setShowUnreadOnly: (show) => {
    set({ showUnreadOnly: show, page: 1 });
    get().fetchNotifications({ page: 1, channel: show ? 'in_app' : undefined, unreadOnly: show });
  },

  setPage: (page) => {
    set({ page });
    get().fetchNotifications({ page });
  }
}));
