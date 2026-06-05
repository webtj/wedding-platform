import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, ProjectStatus, TaskStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors/app-error';
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

  async update(input: {
    tenantId: string;
    userId: string;
    taskId: string;
    data: UpdateTaskDto;
  }) {
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, tenantId: input.tenantId },
      include: { assignees: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only enforce role-based permission if task has assignees
    if (task.assignees && task.assignees.length > 0) {
      const projectMember = await this.prisma.projectMember.findFirst({
        where: {
          projectId: task.projectId,
          userId: input.userId,
        },
      });

      if (!projectMember) {
        throw AppError.forbidden('You are not a member of this project');
      }
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
    // Auto-sync project status when task status changes
    if (input.data.status) {
      void this.syncProjectStatus(input.tenantId, task.projectId);
    }
    return updated;
  }

  async complete(input: {
    tenantId: string;
    userId: string;
    taskId: string;
  }) {
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, tenantId: input.tenantId },
      include: { assignees: true },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Only enforce role-based permission if task has assignees
    if (task.assignees && task.assignees.length > 0) {
      const projectMember = await this.prisma.projectMember.findFirst({
        where: {
          projectId: task.projectId,
          userId: input.userId,
        },
      });

      if (!projectMember) {
        throw AppError.forbidden('You are not a member of this project');
      }
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
      where: { tenantId: input.tenantId, projectId: task.projectId }
    });
    if (plannerMember) {
      await this.notifications.create({
        tenantId: input.tenantId,
        userId: plannerMember.userId,
        type: NotificationType.task,
        title: '任务已完成',
        body: task.title,
        link: `/planner/projects/${task.projectId}`
      });
    }
    // Auto-sync project status when task is completed
    void this.syncProjectStatus(input.tenantId, task.projectId);
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
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.taskAssignee.create({ data: { taskId: input.taskId, memberId: input.memberId } });
  }

  async removeAssignee(input: { tenantId: string; id: string }) {
    return this.prisma.taskAssignee.deleteMany({ where: { id: input.id } });
  }

  async reorderTasks(input: {
    tenantId: string;
    tasks: Array<{ id: string; stageId: string; sortOrder: number }>;
  }) {
    const updates = input.tasks.map((task) =>
      this.prisma.task.update({
        where: { id: task.id, tenantId: input.tenantId },
        data: { stageId: task.stageId, sortOrder: task.sortOrder },
      })
    );

    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async listMembers(input: { tenantId: string }) {
    return this.prisma.tenantMember.findMany({
      where: { tenantId: input.tenantId, status: 'active' },
      select: { id: true, displayName: true }
    });
  }

  async createSubtask(input: { tenantId: string; taskId: string; title: string }) {
    const task = await this.prisma.task.findFirst({
      where: { id: input.taskId, tenantId: input.tenantId },
    });
    if (!task) throw AppError.notFound('Task', input.taskId);

    const maxOrder = await this.prisma.subtask.aggregate({
      where: { taskId: input.taskId },
      _max: { sortOrder: true },
    });

    return this.prisma.subtask.create({
      data: {
        taskId: input.taskId,
        tenantId: input.tenantId,
        title: input.title,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async toggleSubtask(input: { tenantId: string; subtaskId: string }) {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id: input.subtaskId, tenantId: input.tenantId },
    });
    if (!subtask) throw AppError.notFound('Subtask', input.subtaskId);

    return this.prisma.subtask.update({
      where: { id: input.subtaskId },
      data: { isCompleted: !subtask.isCompleted },
    });
  }

  async deleteSubtask(input: { tenantId: string; subtaskId: string }) {
    const subtask = await this.prisma.subtask.findFirst({
      where: { id: input.subtaskId, tenantId: input.tenantId },
    });
    if (!subtask) throw AppError.notFound('Subtask', input.subtaskId);

    await this.prisma.subtask.delete({ where: { id: input.subtaskId } });
    return { deleted: true };
  }

  async listSubtasks(input: { tenantId: string; taskId: string }) {
    return this.prisma.subtask.findMany({
      where: { taskId: input.taskId, tenantId: input.tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Auto-calculate project status from its tasks.
   * - pending: no task has been completed
   * - active: at least one task is done, but not all
   * - completed: all tasks are done
   */
  private async syncProjectStatus(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { status: true }
    });
    if (!project) return;

    const stages = await this.prisma.projectStage.findMany({
      where: { projectId, tenantId },
      include: { tasks: { select: { status: true } } }
    });

    const allTasks = stages.flatMap((s) => s.tasks);
    const doneCount = allTasks.filter((t) => t.status === 'done').length;

    let newStatus: ProjectStatus;
    if (allTasks.length === 0) {
      newStatus = ProjectStatus.pending;
    } else if (doneCount === allTasks.length) {
      newStatus = ProjectStatus.completed;
    } else if (doneCount > 0) {
      newStatus = ProjectStatus.active;
    } else {
      newStatus = ProjectStatus.pending;
    }

    if (newStatus !== project.status) {
      await this.prisma.project.update({
        where: { id: projectId, tenantId },
        data: { status: newStatus }
      });
    }
  }
}
