import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProcessTemplateDto, UpdateProcessTemplateDto, CreateTemplateStageDto, UpdateTemplateStageDto, CreateTemplateTaskDto, UpdateTemplateTaskDto, CreateChecklistItemDto } from './dto';

@Injectable()
export class ProcessTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: { tenantId: string; search?: string; category?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const where: Record<string, unknown> = { tenantId: input.tenantId };
    if (input.search) where.name = { contains: input.search };
    if (input.category) where.category = input.category;
    const [items, total] = await Promise.all([
      this.prisma.processTemplate.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        include: { _count: { select: { stages: true } } },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.processTemplate.count({ where })
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async get(input: { tenantId: string; templateId: string }) {
    const t = await this.prisma.processTemplate.findFirst({
      where: { id: input.templateId, tenantId: input.tenantId },
      include: { stages: { orderBy: { sortOrder: 'asc' }, include: { tasks: { orderBy: { sortOrder: 'asc' }, include: { checklistItems: { orderBy: { sortOrder: 'asc' } }, assignedRole: { select: { id: true, name: true } }, assignees: { include: { member: { select: { id: true, displayName: true } } } } } } } } }
    });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async create(input: { tenantId: string; data: CreateProcessTemplateDto }) {
    return this.prisma.processTemplate.create({ data: { tenantId: input.tenantId, ...input.data } });
  }

  async update(input: { tenantId: string; templateId: string; data: UpdateProcessTemplateDto }) {
    await this.get({ tenantId: input.tenantId, templateId: input.templateId });
    return this.prisma.processTemplate.update({ where: { id: input.templateId }, data: input.data });
  }

  async delete(input: { tenantId: string; templateId: string }) {
    await this.get({ tenantId: input.tenantId, templateId: input.templateId });
    await this.prisma.processTemplate.delete({ where: { id: input.templateId } });
    return { deleted: true };
  }

  async duplicate(input: { tenantId: string; templateId: string }) {
    const original = await this.get({ tenantId: input.tenantId, templateId: input.templateId });
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.processTemplate.create({
        data: { tenantId: input.tenantId, name: `${original.name} (副本)`, description: original.description, category: original.category }
      });
      for (const stage of original.stages) {
        const newStage = await tx.processTemplateStage.create({
          data: { templateId: copy.id, name: stage.name, description: stage.description, sortOrder: stage.sortOrder }
        });
        for (const task of stage.tasks) {
          const newTask = await tx.processTemplateTask.create({
            data: { stageId: newStage.id, title: task.title, description: task.description, assigneeType: task.assigneeType, assignedRoleId: task.assignedRoleId, priority: task.priority, offsetDays: task.offsetDays, sortOrder: task.sortOrder }
          });
          if (task.assignees?.length) {
            await tx.processTemplateTaskAssignee.createMany({
              data: task.assignees.map((a: any) => ({ templateTaskId: newTask.id, memberId: a.memberId }))
            });
          }
        }
      }
      return copy;
    });
  }

  async addStage(input: { tenantId: string; templateId: string; data: CreateTemplateStageDto }) {
    await this.get({ tenantId: input.tenantId, templateId: input.templateId });
    return this.prisma.processTemplateStage.create({ data: { templateId: input.templateId, ...input.data } });
  }

  async updateStage(input: { tenantId: string; stageId: string; data: UpdateTemplateStageDto }) {
    const stage = await this.prisma.processTemplateStage.findUnique({ where: { id: input.stageId }, include: { template: true } });
    if (!stage || stage.template.tenantId !== input.tenantId) throw new NotFoundException('Stage not found');
    return this.prisma.processTemplateStage.update({ where: { id: input.stageId }, data: input.data });
  }

  async deleteStage(input: { tenantId: string; stageId: string }) {
    const stage = await this.prisma.processTemplateStage.findUnique({ where: { id: input.stageId }, include: { template: true } });
    if (!stage || stage.template.tenantId !== input.tenantId) throw new NotFoundException('Stage not found');
    await this.prisma.processTemplateStage.delete({ where: { id: input.stageId } });
    return { deleted: true };
  }

  async reorderStages(input: { tenantId: string; templateId: string; items: { id: string; sortOrder: number }[] }) {
    await this.get({ tenantId: input.tenantId, templateId: input.templateId });
    await this.prisma.$transaction(input.items.map((item) => this.prisma.processTemplateStage.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
  }

  async addTask(input: { tenantId: string; stageId: string; data: CreateTemplateTaskDto }) {
    const stage = await this.prisma.processTemplateStage.findUnique({ where: { id: input.stageId }, include: { template: true } });
    if (!stage || stage.template.tenantId !== input.tenantId) throw new NotFoundException('Stage not found');
    return this.prisma.processTemplateTask.create({ data: { stageId: input.stageId, ...input.data } });
  }

  async updateTask(input: { tenantId: string; taskId: string; data: UpdateTemplateTaskDto }) {
    const task = await this.prisma.processTemplateTask.findUnique({ where: { id: input.taskId }, include: { stage: { include: { template: true } } } });
    if (!task || task.stage.template.tenantId !== input.tenantId) throw new NotFoundException('Task not found');
    return this.prisma.processTemplateTask.update({ where: { id: input.taskId }, data: input.data });
  }

  async deleteTask(input: { tenantId: string; taskId: string }) {
    const task = await this.prisma.processTemplateTask.findUnique({ where: { id: input.taskId }, include: { stage: { include: { template: true } } } });
    if (!task || task.stage.template.tenantId !== input.tenantId) throw new NotFoundException('Task not found');
    await this.prisma.processTemplateTask.delete({ where: { id: input.taskId } });
    return { deleted: true };
  }

  async reorderTasks(input: { tenantId: string; stageId: string; items: { id: string; sortOrder: number }[] }) {
    await this.prisma.$transaction(input.items.map((item) => this.prisma.processTemplateTask.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
  }

  async addChecklistItem(input: { tenantId: string; taskId: string; data: CreateChecklistItemDto }) {
    const task = await this.prisma.processTemplateTask.findUnique({ where: { id: input.taskId }, include: { stage: { include: { template: true } } } });
    if (!task || task.stage.template.tenantId !== input.tenantId) throw new NotFoundException('Task not found');
    return this.prisma.processTemplateChecklistItem.create({ data: { taskId: input.taskId, ...input.data } });
  }

  async deleteChecklistItem(input: { tenantId: string; itemId: string }) {
    const item = await this.prisma.processTemplateChecklistItem.findUnique({ where: { id: input.itemId }, include: { task: { include: { stage: { include: { template: true } } } } } });
    if (!item || item.task.stage.template.tenantId !== input.tenantId) throw new NotFoundException('Item not found');
    await this.prisma.processTemplateChecklistItem.delete({ where: { id: input.itemId } });
    return { deleted: true };
  }

  async getTaskAssignees(input: { tenantId: string; taskId: string }) {
    const task = await this.prisma.processTemplateTask.findUnique({ where: { id: input.taskId }, include: { stage: { include: { template: true } } } });
    if (!task || task.stage.template.tenantId !== input.tenantId) throw new NotFoundException('Task not found');
    return this.prisma.processTemplateTaskAssignee.findMany({ where: { templateTaskId: input.taskId }, include: { member: { select: { id: true, displayName: true } } } });
  }

  async addTaskAssignee(input: { tenantId: string; taskId: string; memberId: string }) {
    const task = await this.prisma.processTemplateTask.findUnique({ where: { id: input.taskId }, include: { stage: { include: { template: true } } } });
    if (!task || task.stage.template.tenantId !== input.tenantId) throw new NotFoundException('Task not found');
    return this.prisma.processTemplateTaskAssignee.create({ data: { templateTaskId: input.taskId, memberId: input.memberId }, include: { member: { select: { id: true, displayName: true } } } });
  }

  async removeTaskAssignee(input: { tenantId: string; id: string }) {
    return this.prisma.processTemplateTaskAssignee.deleteMany({ where: { id: input.id } });
  }

  async applyToProject(input: { tenantId: string; projectId: string; templateId: string; reset?: boolean }) {
    const template = await this.get({ tenantId: input.tenantId, templateId: input.templateId });
    const project = await this.prisma.project.findFirst({ where: { id: input.projectId, tenantId: input.tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.$transaction(async (tx) => {
      if (input.reset) {
        await tx.taskAssignee.deleteMany({ where: { task: { projectId: input.projectId } } });
        await tx.taskMaterial.deleteMany({ where: { task: { projectId: input.projectId } } });
        await tx.task.deleteMany({ where: { projectId: input.projectId } });
        await tx.projectStage.deleteMany({ where: { projectId: input.projectId } });
      }
      await tx.project.update({ where: { id: input.projectId }, data: { appliedTemplateId: input.templateId } });
      const stages: any[] = [];
      const tasks: any[] = [];
      for (const ts of template.stages) {
        const stage = await tx.projectStage.create({
          data: { tenantId: input.tenantId, projectId: input.projectId, name: ts.name, description: ts.description, sortOrder: ts.sortOrder, status: 'pending' }
        });
        stages.push(stage);
        for (const tt of ts.tasks) {
          let dueDate = new Date(project.createdAt.getTime() + tt.offsetDays * 86400000);
          if (project.weddingDate && dueDate > project.weddingDate) dueDate = project.weddingDate;
          const task = await tx.task.create({
            data: { tenantId: input.tenantId, projectId: input.projectId, stageId: stage.id, title: tt.title, description: tt.description, assigneeType: tt.assigneeType, assignedRoleId: tt.assignedRoleId, priority: tt.priority, sortOrder: tt.sortOrder, dueDate }
          });
          if (tt.assignees?.length) {
            await tx.taskAssignee.createMany({
              data: tt.assignees.map((a: any) => ({ taskId: task.id, memberId: a.memberId }))
            });
          }
          tasks.push(task);
        }
      }
      return { stages, tasks };
    });
  }
}
