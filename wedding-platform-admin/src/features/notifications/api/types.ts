export type NotificationType =
  | 'task'
  | 'task_reminder'
  | 'asset'
  | 'ai'
  | 'system'
  | 'contract_update'
  | 'payment_received'
  | 'system_alert';

export type NotificationChannel = 'in_app' | 'sms' | 'email';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  phone: string | null;
  email: string | null;
  preferInApp: boolean;
  preferSms: boolean;
  preferEmail: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferences {
  phone?: string | null;
  email?: string | null;
  preferInApp?: boolean;
  preferSms?: boolean;
  preferEmail?: boolean;
}

export interface NotificationListParams {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  channel?: NotificationChannel;
  unreadOnly?: boolean;
}
