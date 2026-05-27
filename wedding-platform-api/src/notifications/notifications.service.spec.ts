import { NotificationType } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('lists only current user notifications', async () => {
    const prisma = { notification: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new NotificationsService(prisma as never);

    await service.listForUser({ tenantId: 'tenant_1', userId: 'user_1' });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1', userId: 'user_1' },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  });

  it('creates a notification payload', async () => {
    const prisma = { notification: { create: vi.fn().mockResolvedValue({ id: 'n_1' }) } };
    const service = new NotificationsService(prisma as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      type: NotificationType.task,
      title: '新任务',
      body: '请确认时间线'
    });

    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('counts unread notifications for current user', async () => {
    const prisma = { notification: { count: vi.fn().mockResolvedValue(2) } };
    const service = new NotificationsService(prisma as never);

    await service.unreadCount({ tenantId: 'tenant_1', userId: 'user_1' });

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
        userId: 'user_1',
        readAt: null
      }
    });
  });
});
