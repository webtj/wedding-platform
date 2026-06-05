import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MemberStatus, NotificationType, ProjectMemberRole } from '@prisma/client';
import { BUILT_IN_ROLES } from '@wedding/shared';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService
  ) {}

  async getProjectTimeline(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        stages: {
          include: {
            tasks: {
              include: { assignees: { include: { member: true } } },
              orderBy: { dueDate: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        tasks: {
          where: { stageId: null },
          include: { assignees: { include: { member: true } } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const weddingDate = new Date(project.weddingDate);
    const today = new Date();
    const daysUntilWedding = Math.ceil(
      (weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const calcDaysUntilDue = (dueDate: Date | null) =>
      dueDate
        ? Math.ceil((new Date(dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    return {
      project: {
        id: project.id,
        projectNo: project.projectNo,
        brideName: project.brideName,
        groomName: project.groomName,
        weddingDate: project.weddingDate,
        venue: project.venue,
        status: project.status,
      },
      weddingDate: project.weddingDate,
      daysUntilWedding,
      stages: project.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        status: stage.status,
        sortOrder: stage.sortOrder,
        tasks: stage.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          isBlocked: task.isBlocked,
          assigneeType: task.assigneeType,
          assignees: task.assignees,
          daysUntilDue: calcDaysUntilDue(task.dueDate),
        })),
      })),
      unassignedTasks: project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        isBlocked: task.isBlocked,
        assigneeType: task.assigneeType,
        assignees: task.assignees,
        daysUntilDue: calcDaysUntilDue(task.dueDate),
      })),
    };
  }

  async listForUser(input: { tenantId: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = { tenantId: input.tenantId };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { members: true },
        orderBy: { weddingDate: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async get(input: { tenantId: string; userId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: input.projectId,
        tenantId: input.tenantId
      },
      include: {
        members: { include: { user: true } },
        tasks: { orderBy: { dueDate: 'asc' } },
        assets: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
