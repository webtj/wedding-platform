import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfirmationEventType, ConfirmationStatus, NotificationType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateConfirmationDto, RespondConfirmationDto } from './dto';

@Injectable()
export class ConfirmationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.confirmation.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      include: { events: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateConfirmationDto }) {
    const confirmation = await this.prisma.confirmation.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        title: input.data.title,
        description: input.data.description,
        category: input.data.category,
        createdByUserId: input.userId,
        events: {
          create: {
            tenantId: input.tenantId,
            type: ConfirmationEventType.created,
            actorUserId: input.userId
          }
        }
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'confirmation.create',
      entity: 'confirmation',
      entityId: confirmation.id,
      metadata: { projectId: input.projectId }
    });
    return confirmation;
  }

  async respond(input: { tenantId: string; userId: string; confirmationId: string; data: RespondConfirmationDto }) {
    const confirmation = await this.prisma.confirmation.findFirst({
      where: { id: input.confirmationId, tenantId: input.tenantId }
    });
    if (!confirmation) {
      throw new NotFoundException('Confirmation not found');
    }
    if (confirmation.status !== ConfirmationStatus.pending) {
      throw new BadRequestException('Confirmation has already been responded to');
    }
    const nextStatus = input.data.decision === 'approved' ? ConfirmationStatus.approved : ConfirmationStatus.rejected;
    const eventType = input.data.decision === 'approved' ? ConfirmationEventType.approved : ConfirmationEventType.rejected;
    const updated = await this.prisma.confirmation.update({
      where: { id: input.confirmationId, tenantId: input.tenantId },
      data: {
        status: nextStatus,
        latestComment: input.data.comment,
        events: {
          create: {
            tenantId: input.tenantId,
            type: eventType,
            comment: input.data.comment,
            actorUserId: input.userId
          }
        }
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: `confirmation.${input.data.decision}`,
      entity: 'confirmation',
      entityId: input.confirmationId,
      metadata: { projectId: confirmation.projectId }
    });
    await this.notifications.create({
      tenantId: input.tenantId,
      userId: confirmation.createdByUserId,
      type: NotificationType.confirmation,
      title: input.data.decision === 'approved' ? '确认项已通过' : '确认项被驳回',
      body: confirmation.title,
      link: `/planner/projects/${confirmation.projectId}`
    });
    return updated;
  }
}
