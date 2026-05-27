import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: {
    tenantId: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {})
      }
    });
  }

  list(input: { tenantId: string; projectId?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        tenantId: input.tenantId,
        ...(input.projectId ? { metadata: { path: ['projectId'], equals: input.projectId } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
