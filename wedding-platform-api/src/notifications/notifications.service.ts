import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface ListNotificationsInput {
  tenantId: string;
  userId: string;
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  channel?: NotificationChannel;
  unreadOnly?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    channel?: NotificationChannel;
    title: string;
    body: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: { ...input, channel: input.channel ?? 'in_app' }
    });
  }

  async listForUser(input: ListNotificationsInput) {
    const { tenantId, userId, page = 1, pageSize = 20, type, channel, unreadOnly } = input;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tenantId,
      userId,
      ...(type && { type }),
      ...(channel && { channel }),
      ...(unreadOnly && { channel: 'in_app', readAt: null })
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.notification.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  markRead(input: { tenantId: string; userId: string; notificationId: string }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        tenantId: input.tenantId,
        userId: input.userId,
        channel: 'in_app'
      },
      data: {
        readAt: new Date()
      }
    });
  }

  markUnread(input: { tenantId: string; userId: string; notificationId: string }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        tenantId: input.tenantId,
        userId: input.userId,
        channel: 'in_app'
      },
      data: {
        readAt: null
      }
    });
  }

  unreadCount(input: { tenantId: string; userId: string }) {
    return this.prisma.notification.count({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        channel: 'in_app',
        readAt: null
      }
    });
  }

  markAllRead(input: { tenantId: string; userId: string }) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        channel: 'in_app',
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });
  }

  deleteNotification(input: { tenantId: string; userId: string; notificationId: string }) {
    return this.prisma.notification.deleteMany({
      where: {
        id: input.notificationId,
        tenantId: input.tenantId,
        userId: input.userId
      }
    });
  }
}
