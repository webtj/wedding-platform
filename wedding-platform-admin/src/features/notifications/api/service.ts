import { apiClient } from '@/lib/api-client';
import type {
  NotificationListResponse,
  UnreadCountResponse,
  NotificationPreferences,
  UpdateNotificationPreferences,
  NotificationListParams
} from './types';

export async function getNotifications(params?: NotificationListParams): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.type) searchParams.set('type', params.type);
  if (params?.channel) searchParams.set('channel', params.channel);
  if (params?.unreadOnly) searchParams.set('unreadOnly', 'true');

  const query = searchParams.toString();
  return apiClient<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`);
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  // The server returns { count: 0 } for users without a tenant context
  // (e.g. platform super admins), so this 30s poll never produces a 403.
  return apiClient<UnreadCountResponse>('/notifications/unread-count');
}

export async function markAsRead(notificationId: string): Promise<void> {
  return apiClient<void>(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export async function markAsUnread(notificationId: string): Promise<void> {
  return apiClient<void>(`/notifications/${notificationId}/unread`, { method: 'PATCH' });
}

export async function markAllAsRead(): Promise<void> {
  return apiClient<void>('/notifications/mark-all-read', { method: 'POST' });
}

export async function deleteNotification(notificationId: string): Promise<void> {
  return apiClient<void>(`/notifications/${notificationId}`, { method: 'DELETE' });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiClient<NotificationPreferences>('/notifications/preferences');
}

export async function updateNotificationPreferences(
  data: UpdateNotificationPreferences
): Promise<NotificationPreferences> {
  return apiClient<NotificationPreferences>('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}
