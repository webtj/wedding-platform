import { NotificationType } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('lists only current user notifications with pagination', async () => {
    const prisma = {
      notification: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0)
      }
    };
    const service = new NotificationsService(prisma as never);

    const result = await service.listForUser({
      tenantId: 'tenant_1',
      userId: 'user_1',
      page: 1,
      pageSize: 20
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1', userId: 'user_1' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20
    });
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
  });

  it('applies type, channel, and unreadOnly filters', async () => {
    const prisma = {
      notification: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
    };
    const service = new NotificationsService(prisma as never);
    await service.listForUser({
      tenantId: 't1', userId: 'u1', type: NotificationType.task, channel: 'in_app', unreadOnly: true
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1', userId: 'u1',
          type: NotificationType.task,
          channel: 'in_app',
          readAt: null
        })
      })
    );
  });

  it('creates a notification payload with default channel=in_app', async () => {
    const prisma = { notification: { create: vi.fn().mockResolvedValue({ id: 'n_1' }) } };
    const service = new NotificationsService(prisma as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      type: NotificationType.task,
      title: '新任务',
      body: '请确认时间线'
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        userId: 'user_1',
        type: NotificationType.task,
        title: '新任务',
        body: '请确认时间线',
        channel: 'in_app'
      }
    });
  });

  it('creates a notification with explicit channel', async () => {
    const prisma = { notification: { create: vi.fn().mockResolvedValue({ id: 'n_1' }) } };
    const service = new NotificationsService(prisma as never);
    await service.create({
      tenantId: 't1', userId: 'u1', type: NotificationType.task, title: 'T', body: 'B', channel: 'sms' as never
    });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ channel: 'sms' }) })
    );
  });

  it('counts unread notifications for current user', async () => {
    const prisma = { notification: { count: vi.fn().mockResolvedValue(2) } };
    const service = new NotificationsService(prisma as never);

    const count = await service.unreadCount({ tenantId: 'tenant_1', userId: 'user_1' });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
        userId: 'user_1',
        channel: 'in_app',
        readAt: null
      }
    });
    expect(count).toBe(2);
  });

  describe('markRead', () => {
    it('sets readAt on the matching notification', async () => {
      const prisma = { notification: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new NotificationsService(prisma as never);
      await service.markRead({ tenantId: 't1', userId: 'u1', notificationId: 'n1' });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', tenantId: 't1', userId: 'u1', channel: 'in_app' },
        data: { readAt: expect.any(Date) }
      });
    });
  });

  describe('markUnread', () => {
    it('sets readAt to null on the matching notification', async () => {
      const prisma = { notification: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new NotificationsService(prisma as never);
      await service.markUnread({ tenantId: 't1', userId: 'u1', notificationId: 'n1' });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', tenantId: 't1', userId: 'u1', channel: 'in_app' },
        data: { readAt: null }
      });
    });
  });

  describe('markAllRead', () => {
    it('sets readAt on all unread in-app notifications for the user', async () => {
      const prisma = { notification: { updateMany: vi.fn().mockResolvedValue({ count: 5 }) } };
      const service = new NotificationsService(prisma as never);
      await service.markAllRead({ tenantId: 't1', userId: 'u1' });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', userId: 'u1', channel: 'in_app', readAt: null },
        data: { readAt: expect.any(Date) }
      });
    });
  });

  describe('deleteNotification', () => {
    it('deletes by id scoped to tenant and user', async () => {
      const prisma = { notification: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new NotificationsService(prisma as never);
      await service.deleteNotification({ tenantId: 't1', userId: 'u1', notificationId: 'n1' });
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'n1', tenantId: 't1', userId: 'u1' }
      });
    });
  });
});
