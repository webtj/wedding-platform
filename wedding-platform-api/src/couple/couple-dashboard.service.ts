import { Injectable } from '@nestjs/common';
import { ConfirmationStatus, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CoupleAccessService } from './couple-access.service';

function percent(done: number, total: number) {
  if (total === 0) {
    return 0;
  }
  return Math.round((done / total) * 100);
}

@Injectable()
export class CoupleDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CoupleAccessService
  ) {}

  async dashboard(input: { tenantId: string; userId: string }) {
    const projects = await this.access.listCoupleProjects(input);
    const activeProject = projects[0] ?? null;
    if (!activeProject) {
      return {
        activeProject: null,
        projects: [],
        progress: null,
        attention: []
      };
    }

    const [progress, attention] = await Promise.all([
      this.progress({ tenantId: input.tenantId, userId: input.userId, projectId: activeProject.id }),
      this.attention({ tenantId: input.tenantId, userId: input.userId, projectId: activeProject.id })
    ]);

    return {
      activeProject,
      projects,
      progress,
      attention
    };
  }

  async progress(input: { tenantId: string; userId: string; projectId: string }) {
    await this.access.requireCoupleProject(input);
    const [tasksTotal, tasksDone, confirmationsTotal, confirmationsDone, stagesTotal, stagesDone] = await Promise.all([
      this.prisma.task.count({ where: { tenantId: input.tenantId, projectId: input.projectId } }),
      this.prisma.task.count({
        where: { tenantId: input.tenantId, projectId: input.projectId, status: { in: [TaskStatus.done, TaskStatus.closed] } }
      }),
      this.prisma.confirmation.count({ where: { tenantId: input.tenantId, projectId: input.projectId } }),
      this.prisma.confirmation.count({
        where: { tenantId: input.tenantId, projectId: input.projectId, status: ConfirmationStatus.approved }
      }),
      this.prisma.projectStage.count({ where: { tenantId: input.tenantId, projectId: input.projectId } }),
      this.prisma.projectStage.count({
        where: { tenantId: input.tenantId, projectId: input.projectId, status: 'done' }
      })
    ]);
    const total = tasksTotal + confirmationsTotal + stagesTotal;
    const done = tasksDone + confirmationsDone + stagesDone;
    return {
      total,
      done,
      percent: percent(done, total),
      tasks: { total: tasksTotal, done: tasksDone },
      confirmations: { total: confirmationsTotal, done: confirmationsDone },
      stages: { total: stagesTotal, done: stagesDone }
    };
  }

  async attention(input: { tenantId: string; userId: string; projectId: string }) {
    await this.access.requireCoupleProject(input);
    const now = new Date();
    const [tasks, confirmations, annotations] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          assigneeType: 'couple',
          status: { in: [TaskStatus.todo, TaskStatus.in_progress] },
          OR: [{ dueDate: null }, { dueDate: { lte: now } }]
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        take: 5
      }),
      this.prisma.confirmation.findMany({
        where: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          status: ConfirmationStatus.pending
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      this.prisma.assetAnnotation.findMany({
        where: {
          tenantId: input.tenantId,
          status: 'pending',
          asset: { projectId: input.projectId }
        },
        include: { asset: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    return [
      ...tasks.map((task) => ({ type: 'task', id: task.id, title: task.title, createdAt: task.createdAt })),
      ...confirmations.map((item) => ({ type: 'confirmation', id: item.id, title: item.title, createdAt: item.createdAt })),
      ...annotations.map((item) => ({ type: 'asset_annotation', id: item.id, title: item.content, createdAt: item.createdAt }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
