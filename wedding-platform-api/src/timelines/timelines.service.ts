import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTimelineItemDto, ReorderTimelineItemsDto, UpdateTimelineItemDto } from './dto';

@Injectable()
export class TimelinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string; coupleOnly?: boolean }) {
    return this.prisma.weddingTimelineItem.findMany({
      where: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        ...(input.coupleOnly ? { visibleToCouple: true } : {})
      },
      orderBy: [{ startTime: 'asc' }, { sortOrder: 'asc' }]
    });
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateTimelineItemDto }) {
    const item = await this.prisma.weddingTimelineItem.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        startTime: new Date(input.data.startTime),
        title: input.data.title,
        description: input.data.description,
        owner: input.data.owner,
        location: input.data.location,
        status: input.data.status,
        sortOrder: input.data.sortOrder,
        visibleToCouple: input.data.visibleToCouple,
        reminderMinutesBefore: input.data.reminderMinutesBefore
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.create',
      entity: 'wedding_timeline_item',
      entityId: item.id,
      metadata: { projectId: input.projectId }
    });
    return item;
  }

  async update(input: { tenantId: string; userId: string; timelineItemId: string; data: UpdateTimelineItemDto }) {
    const existing = await this.prisma.weddingTimelineItem.findFirst({
      where: { id: input.timelineItemId, tenantId: input.tenantId }
    });
    if (!existing) {
      throw new NotFoundException('Timeline item not found');
    }
    const updated = await this.prisma.weddingTimelineItem.update({
      where: { id: input.timelineItemId, tenantId: input.tenantId },
      data: {
        ...input.data,
        startTime: input.data.startTime ? new Date(input.data.startTime) : undefined
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.update',
      entity: 'wedding_timeline_item',
      entityId: input.timelineItemId,
      metadata: { projectId: existing.projectId }
    });
    return updated;
  }

  async reorder(input: { tenantId: string; userId: string; projectId: string; data: ReorderTimelineItemsDto }) {
    await this.prisma.$transaction(
      input.data.items.map((item: { id: string; sortOrder: number }) =>
        this.prisma.weddingTimelineItem.updateMany({
          where: { id: item.id, tenantId: input.tenantId, projectId: input.projectId },
          data: { sortOrder: item.sortOrder }
        })
      )
    );
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'timeline_item.reorder',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId }
    });
    return this.list({ tenantId: input.tenantId, projectId: input.projectId });
  }
}
