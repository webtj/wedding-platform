import { queryOptions } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  getNotificationPreferences
} from './service';
import type { NotificationListParams } from './types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationListParams) => [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const
};

export const notificationsQueryOptions = (params?: NotificationListParams) =>
  queryOptions({
    queryKey: notificationKeys.list(params),
    queryFn: () => getNotifications(params)
  });

export const unreadCountQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 30000 // Poll every 30 seconds
  });

export const notificationPreferencesQueryOptions = () =>
  queryOptions({
    queryKey: notificationKeys.preferences(),
    queryFn: getNotificationPreferences
  });
