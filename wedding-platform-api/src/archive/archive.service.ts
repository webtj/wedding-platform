import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ArchiveProjectDto, CompleteProjectDto } from './dto';

@Injectable()
export class ArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async completeProject(input: { tenantId: string; userId: string; projectId: string; data: CompleteProjectDto }) {
    const project = await this.prisma.project.findFirst({ where: { id: input.projectId, tenantId: input.tenantId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const updated = await this.prisma.project.update({
      where: { id: input.projectId },
      data: {
        status: ProjectStatus.completed,
        completedAt: input.data.completedAt ? new Date(input.data.completedAt) : new Date(),
        archiveNote: input.data.note
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'project.complete',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId }
    });
    return updated;
  }

  async archiveProject(input: { tenantId: string; userId: string; projectId: string; data: ArchiveProjectDto }) {
    const project = await this.prisma.project.findFirst({ where: { id: input.projectId, tenantId: input.tenantId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const updated = await this.prisma.project.update({
      where: { id: input.projectId },
      data: {
        status: ProjectStatus.completed,
        archivedAt: input.data.archivedAt ? new Date(input.data.archivedAt) : new Date(),
        archiveNote: input.data.reason
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'project.archive',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId }
    });
    return updated;
  }

  async summary(input: { tenantId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId },
      include: {
        _count: {
          select: {
            assets: true,
            tasks: true,
            confirmations: true,
            aiOutputs: true,
            archivePackages: true
          }
        },
        retentionPolicy: true,
        archivePackages: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
