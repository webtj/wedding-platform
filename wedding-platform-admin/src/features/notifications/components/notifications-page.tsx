'use client';

import { useEffect } from 'react';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationCard } from '@/components/ui/notification-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationStore } from '../utils/store';
import { useRouter } from 'next/navigation';
import type { NotificationType } from '../api/types';

const notificationTypeLabels: Record<string, string> = {
  task: 'Task',
  task_reminder: 'Task Reminder',
  asset: 'Asset',
  ai: 'AI',
  system: 'System',
  contract_update: 'Contract',
  payment_received: 'Payment',
  system_alert: 'Alert'
};

export default function NotificationsPage() {
  const {
    notifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    removeNotification,
    fetchNotifications,
    fetchUnreadCount,
    unreadCount,
    isLoading,
    page,
    totalPages,
    total,
    activeType,
    showUnreadOnly,
    setActiveType,
    setShowUnreadOnly,
    setPage
  } = useNotificationStore();
  const router = useRouter();
  const count = unreadCount;

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const renderList = () => {
    if (isLoading) {
      return (
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='bg-muted h-24 animate-pulse rounded-2xl' />
          ))}
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>No notifications</p>
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {notifications.map((notification) => {
          const isInApp = notification.channel === 'in_app';
          const cardStatus = isInApp ? (notification.readAt ? 'read' : 'unread') : 'read';

          return (
            <div key={notification.id} className='group relative'>
              <NotificationCard
                id={notification.id}
                title={notification.title}
                body={notification.body}
                status={cardStatus}
                createdAt={notification.createdAt}
                onMarkAsRead={isInApp ? markAsRead : undefined}
                onAction={(_notifId, _actionId) => {
                  if (notification.link) {
                    if (isInApp) markAsRead(notification.id);
                    router.push(notification.link);
                  }
                }}
              />
              {!isInApp && (
                <div className='absolute top-3 right-12'>
                  <Badge variant='secondary' className='text-[10px]'>
                    {notification.channel === 'sms' ? 'SMS sent' : 'Email sent'}
                  </Badge>
                </div>
              )}
              {isInApp && (
                <div className='absolute top-3 right-12 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                  {notification.readAt ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      onClick={() => markAsUnread(notification.id)}
                      title='Mark as unread'
                    >
                      <Icons.eye className='h-3.5 w-3.5' />
                    </Button>
                  ) : null}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='text-destructive h-7 w-7'
                    onClick={() => removeNotification(notification.id)}
                    title='Delete'
                  >
                    <Icons.trash className='h-3.5 w-3.5' />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer
      pageTitle='Message Center'
      pageDescription='View and manage all your notifications.'
      pageHeaderAction={
        count > 0 ? (
          <Button variant='outline' size='sm' onClick={markAllAsRead}>
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Select
          value={activeType ?? 'all'}
          onValueChange={(value) => setActiveType(value === 'all' ? null : (value as NotificationType))}
        >
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder='All types' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All types</SelectItem>
            {Object.entries(notificationTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showUnreadOnly ? 'default' : 'outline'}
          size='sm'
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
        >
          Unread only
        </Button>

        <div className='text-muted-foreground ml-auto text-sm'>
          {total} notification{total !== 1 ? 's' : ''}
        </div>
      </div>

      {renderList()}

      {totalPages > 1 && (
        <div className='mt-6 flex items-center justify-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className='text-muted-foreground text-sm'>
            Page {page} of {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
