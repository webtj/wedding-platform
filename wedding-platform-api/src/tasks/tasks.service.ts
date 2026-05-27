import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, TaskStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { parseDateOnly } from '../common/parse-date';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.task.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
    });
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateTaskDto }) {
    const task = await this.prisma.task.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        title: input.data.title,
        description: input.data.description,
        assigneeType: input.data.assigneeType,
        assignedRoleId: input.data.assignedRoleId,
        dueDate: parseDateOnly(input.data.dueDate),
        priority: input.data.priority
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'task.create',
      entity: 'task',
      entityId: task.id,
      metadata: { projectId: input.projectId }
    });
    return task;
  }

  async update(input: { tenantId: string; userId: string; taskId: string; data: UpdateTaskDto }) {
    const task = await this.prisma.task.findFirst({ where: { id: input.taskId, tenantId: input.tenantId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const updated = await this.prisma.task.update({
      where: { id: input.taskId, tenantId: input.tenantId },
      data: {
        ...input.data,
        dueDate: parseDateOnly(input.data.dueDate)
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'task.update',
      entity: 'task',
      entityId: input.taskId,
      metadata: { projectId: task.projectId }
    });
    return updated;
  }

  async complete(input: { tenantId: string; userId: string; taskId: string }) {
    const task = await this.prisma.task.findFirst({ where: { id: input.taskId, tenantId: input.tenantId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const updated = await this.prisma.task.update({
      where: { id: input.taskId, tenantId: input.tenantId },
      data: {
        status: TaskStatus.done,
        completedAt: new Date()
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'task.complete',
      entity: 'task',
      entityId: input.taskId,
      metadata: { projectId: task.projectId }
    });
    // Notify the planner who created/assigned the task, not the completing user
    const plannerMember = await this.prisma.projectMember.findFirst({
      where: { tenantId: input.tenantId, projectId: task.projectId, role: 'planner' }
    });
    if (plannerMember) {
      await this.notifications.create({
        tenantId: input.tenantId,
        userId: plannerMember.userId,
        type: NotificationType.task,
        title: '新人已完成任务',
        body: task.title,
        link: `/planner/projects/${task.projectId}`
      });
    }
    return updated;
  }

  async getAssignees(input: { tenantId: string; taskId: string }) {
    return this.prisma.taskAssignee.findMany({
      where: { taskId: input.taskId, task: { tenantId: input.tenantId } },
      include: { member: { select: { id: true, displayName: true } } }
    });
  }

  async addAssignee(input: { tenantId: string; taskId: string; memberId: string }) {
    const task = await this.prisma.task.findFirst({ where: { id: input.taskId, tenantId: input.tenantId } });
    if (!task) throw new Error('Task not found');
    return this.prisma.taskAssignee.create({ data: { taskId: input.taskId, memberId: input.memberId } });
  }

  async removeAssignee(input: { tenantId: string; id: string }) {
    return this.prisma.taskAssignee.deleteMany({ where: { id: input.id } });
  }

  async listMembers(input: { tenantId: string }) {
    return this.prisma.tenantMember.findMany({
      where: { tenantId: input.tenantId, status: 'active' },
      select: { id: true, displayName: true }
    });
  }
}
