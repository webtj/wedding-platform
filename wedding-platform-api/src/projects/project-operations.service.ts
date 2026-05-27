import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectStatus, ProjectMemberRole } from '@prisma/client';
import type { UpdateProjectDto } from './dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnly } from '../common/parse-date';

@Injectable()
export class ProjectOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listOperations(input: { tenantId: string; status?: string; search?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId: input.tenantId };
    if (input.status) where.status = input.status;
    if (input.search) {
      where.OR = [
        { projectNo: { contains: input.search } },
        { brideName: { contains: input.search } },
        { groomName: { contains: input.search } },
        { venue: { contains: input.search } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { stages: { orderBy: { sortOrder: 'asc' } }, contracts: { select: { id: true, contractNo: true } } },
        orderBy: [{ status: 'asc' }, { weddingDate: 'asc' }],
        skip,
        take: pageSize
      }),
      this.prisma.project.count({ where })
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async update(input: { tenantId: string; userId: string; projectId: string; data: UpdateProjectDto }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const updated = await this.prisma.project.update({
      where: { id: input.projectId, tenantId: input.tenantId },
      data: {
        ...input.data,
        weddingDate: parseDateOnly(input.data.weddingDate)
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'project.update',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId }
    });
    return updated;
  }

  async createFromContract(input: {
    tenantId: string; userId: string; memberId: string; contractId: string;
    data: {
      brideName: string; groomName: string; weddingDate: string;
      ceremonyType?: string; venue?: string; guestCount?: number;
      colorTheme?: string; style?: string; specialRequirements?: string;
      plannerId?: string;
    };
  }) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: input.contractId, tenantId: input.tenantId },
      include: { lead: true }
    });
    if (!contract) throw new NotFoundException('Contract not found');

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    const projectNo = `PJ-${randomPart}-${datePart}`;

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          tenantId: input.tenantId,
          projectNo,
          leadId: contract.leadId ?? undefined,
          brideName: input.data.brideName,
          groomName: input.data.groomName,
          weddingDate: parseDateOnly(input.data.weddingDate)!,
          ceremonyType: input.data.ceremonyType,
          venue: input.data.venue,
          guestCount: input.data.guestCount,
          colorTheme: input.data.colorTheme,
          style: input.data.style,
          specialRequirements: input.data.specialRequirements,
          plannerId: input.data.plannerId,
          members: {
            create: {
              tenantId: input.tenantId,
              userId: input.userId,
              memberId: input.memberId,
              role: ProjectMemberRole.planner
            }
          }
        }
      });

      await tx.contract.update({
        where: { id: input.contractId },
        data: { projectId: project.id }
      });

      await this.audit.record({
        tenantId: input.tenantId,
        userId: input.userId,
        action: 'project.create_from_contract',
        entity: 'project',
        entityId: project.id,
        metadata: { contractId: input.contractId, leadId: contract.leadId }
      });

      return project;
    });
  }

  async kanban(input: { tenantId: string; projectId: string }) {
    const stages = await this.prisma.projectStage.findMany({
      where: { projectId: input.projectId, tenantId: input.tenantId },
      orderBy: { sortOrder: 'asc' },
      include: {
        tasks: { orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }, { sortOrder: 'asc' }], include: { assignees: { include: { member: { select: { id: true, displayName: true } } } }, assignedRole: { select: { id: true, name: true } }, taskMaterials: { include: { material: { include: { category: true } } } } } }
      }
    });
    return {
      stages: stages.map((s) => ({
        ...s,
        taskCount: s.tasks.length,
        doneCount: s.tasks.filter((t) => t.status === 'done').length
      }))
    };
  }

  async dashboard(input: { tenantId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId },
      include: { stages: { include: { tasks: true } } }
    });
    if (!project) throw new NotFoundException('Project not found');

    const allTasks = project.stages.flatMap((s) => s.tasks);
    const totalTasks = allTasks.length;
    const doneTasks = allTasks.filter((t) => t.status === 'done').length;
    const blockedTasks = allTasks.filter((t) => t.isBlocked).length;
    const now = new Date();
    const overdueTasks = allTasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== 'done').length;
    const activeStage = project.stages.find((s) => s.status === 'active') ?? null;
    const weddingDaysRemaining = project.weddingDate ? Math.ceil((project.weddingDate.getTime() - now.getTime()) / 86400000) : null;

    return {
      project: { id: project.id, projectNo: project.projectNo, brideName: project.brideName, groomName: project.groomName, weddingDate: project.weddingDate, venue: project.venue, status: project.status },
      overallProgress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      activeStage: activeStage ? { id: activeStage.id, name: activeStage.name } : null,
      stageTimeline: project.stages.map((s) => ({ id: s.id, name: s.name, status: s.status, taskCount: s.tasks.length, doneCount: s.tasks.filter((t) => t.status === 'done').length })),
      blockedCount: blockedTasks,
      overdueCount: overdueTasks,
      weddingDaysRemaining
    };
  }
}
