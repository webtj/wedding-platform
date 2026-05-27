import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectStageStatus } from '@prisma/client';
import type { CreateProjectStageDto, UpdateProjectStageDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnly } from '../common/parse-date';

@Injectable()
export class ProjectStagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.projectStage.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateProjectStageDto }) {
    const stage = await this.prisma.projectStage.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        name: input.data.name,
        description: input.data.description,
        dueDate: parseDateOnly(input.data.dueDate),
        sortOrder: input.data.sortOrder
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'project_stage.create',
      entity: 'project_stage',
      entityId: stage.id,
      metadata: { projectId: input.projectId }
    });
    return stage;
  }

  async update(input: { tenantId: string; userId: string; stageId: string; data: UpdateProjectStageDto }) {
    const stage = await this.prisma.projectStage.findFirst({ where: { id: input.stageId, tenantId: input.tenantId } });
    if (!stage) {
      throw new NotFoundException('Project stage not found');
    }
    const updated = await this.prisma.projectStage.update({
      where: { id: input.stageId, tenantId: input.tenantId },
      data: {
        ...input.data,
        dueDate: parseDateOnly(input.data.dueDate),
        completedAt: input.data.status === ProjectStageStatus.done ? new Date() : undefined
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'project_stage.update',
      entity: 'project_stage',
      entityId: input.stageId,
      metadata: { projectId: stage.projectId }
    });
    return updated;
  }
}
