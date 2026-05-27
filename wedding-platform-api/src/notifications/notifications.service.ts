import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data: input });
  }

  listForUser(input: { tenantId: string; userId: string }) {
    return this.prisma.notification.findMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  markRead(input: { tenantId: string; userId: string; notificationId: string }) {
    return this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        tenantId: input.tenantId,
        userId: input.userId
      },
      data: {
        readAt: new Date()
      }
    });
  }

  unreadCount(input: { tenantId: string; userId: string }) {
    return this.prisma.notification.count({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        readAt: null
      }
    });
  }

  markAllRead(input: { tenantId: string; userId: string }) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });
  }
}
