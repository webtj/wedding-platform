import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProcessTemplatesService } from './process-templates.service';

const buildTemplate = (overrides: Record<string, unknown> = {}) => ({
  id: 'tpl1',
  tenantId: 't1',
  name: '婚礼流程',
  description: null,
  category: null,
  stages: [],
  ...overrides
});

const mockGet = (prisma: { processTemplate: { findFirst: ReturnType<typeof vi.fn> } }) => (overrides?: Record<string, unknown>) =>
  prisma.processTemplate.findFirst.mockResolvedValueOnce(
    buildTemplate(overrides)
  );

describe('ProcessTemplatesService', () => {
  describe('list', () => {
    it('paginates with optional search and category filters', async () => {
      const prisma = {
        processTemplate: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.list({ tenantId: 't1', search: '婚礼', category: 'standard' });
      expect(prisma.processTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', name: { contains: '婚礼' }, category: 'standard' },
          skip: 0, take: 10
        })
      );
    });
  });

  describe('get', () => {
    it('returns the template with nested stages/tasks/checklistItems', async () => {
      const tpl = buildTemplate({ stages: [{ id: 's1', tasks: [] }] });
      const prisma = { processTemplate: { findFirst: vi.fn().mockResolvedValue(tpl) } };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.get({ tenantId: 't1', templateId: 'tpl1' });
      expect(result).toEqual(tpl);
    });

    it('throws NotFound when template does not exist', async () => {
      const prisma = { processTemplate: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ProcessTemplatesService(prisma as never);
      await expect(service.get({ tenantId: 't1', templateId: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a template with tenantId', async () => {
      const prisma = { processTemplate: { create: vi.fn().mockResolvedValue({ id: 'tpl1' }) } };
      const service = new ProcessTemplatesService(prisma as never);
      await service.create({ tenantId: 't1', data: { name: '新模板' } as never });
      expect(prisma.processTemplate.create).toHaveBeenCalledWith({ data: { tenantId: 't1', name: '新模板' } });
    });
  });

  describe('update', () => {
    it('updates after get validation', async () => {
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(buildTemplate()), update: vi.fn().mockResolvedValue({}) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.update({ tenantId: 't1', templateId: 'tpl1', data: { name: '新' } as never });
      expect(prisma.processTemplate.update).toHaveBeenCalledWith({ where: { id: 'tpl1' }, data: { name: '新' } });
    });
  });

  describe('delete', () => {
    it('deletes after get validation', async () => {
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(buildTemplate()), delete: vi.fn().mockResolvedValue({}) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.delete({ tenantId: 't1', templateId: 'tpl1' });
      expect(result).toEqual({ deleted: true });
      expect(prisma.processTemplate.delete).toHaveBeenCalledWith({ where: { id: 'tpl1' } });
    });
  });

  describe('duplicate', () => {
    it('deep copies stages, tasks, and assignees in a transaction', async () => {
      const tpl = buildTemplate({
        stages: [{
          id: 's1', name: '筹备', description: null, sortOrder: 0,
          tasks: [{
            id: 't1', title: '选婚纱', description: null, assigneeType: 'planner',
            assignedRoleId: null, priority: 3, offsetDays: 7, sortOrder: 0,
            assignees: [{ memberId: 'm1' }]
          }]
        }]
      });
      const tx = {
        processTemplate: { create: vi.fn().mockResolvedValue({ id: 'copy1', name: '婚礼流程 (副本)' }) },
        processTemplateStage: { create: vi.fn().mockResolvedValue({ id: 'new_s1' }) },
        processTemplateTask: { create: vi.fn().mockResolvedValue({ id: 'new_t1' }) },
        processTemplateTaskAssignee: { createMany: vi.fn().mockResolvedValue({ count: 1 }) }
      };
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(tpl) },
        $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx))
      };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.duplicate({ tenantId: 't1', templateId: 'tpl1' });

      expect(result).toEqual({ id: 'copy1', name: '婚礼流程 (副本)' });
      expect(tx.processTemplateStage.create).toHaveBeenCalled();
      expect(tx.processTemplateTask.create).toHaveBeenCalled();
      expect(tx.processTemplateTaskAssignee.createMany).toHaveBeenCalled();
    });
  });

  describe('addStage', () => {
    it('creates a template stage after get validation', async () => {
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(buildTemplate()) },
        processTemplateStage: { create: vi.fn().mockResolvedValue({ id: 's1' }) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.addStage({ tenantId: 't1', templateId: 'tpl1', data: { name: '筹备', sortOrder: 0 } as never });
      expect(prisma.processTemplateStage.create).toHaveBeenCalledWith({
        data: { templateId: 'tpl1', name: '筹备', sortOrder: 0 }
      });
    });
  });

  describe('updateStage', () => {
    it('updates after tenantId validation via template join', async () => {
      const prisma = {
        processTemplateStage: {
          findUnique: vi.fn().mockResolvedValue({ id: 's1', template: { tenantId: 't1' } }),
          update: vi.fn().mockResolvedValue({ id: 's1' })
        }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.updateStage({ tenantId: 't1', stageId: 's1', data: { name: '新' } as never });
      expect(prisma.processTemplateStage.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { name: '新' } });
    });

    it('throws NotFound when stage is missing or tenantId mismatch', async () => {
      const prisma = { processTemplateStage: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new ProcessTemplatesService(prisma as never);
      await expect(service.updateStage({ tenantId: 't1', stageId: 's1', data: {} })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteStage', () => {
    it('deletes after validation', async () => {
      const prisma = {
        processTemplateStage: {
          findUnique: vi.fn().mockResolvedValue({ id: 's1', template: { tenantId: 't1' } }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.deleteStage({ tenantId: 't1', stageId: 's1' });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('reorderStages', () => {
    it('runs stage sort updates in a transaction', async () => {
      const updateMock = vi.fn();
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(buildTemplate()) },
        processTemplateStage: { update: updateMock },
        $transaction: vi.fn((arr: Promise<unknown>[]) => Promise.all(arr))
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.reorderStages({ tenantId: 't1', templateId: 'tpl1', items: [{ id: 's1', sortOrder: 0 }] });
      expect(updateMock).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('addTask', () => {
    it('throws NotFound when stage does not exist or tenant mismatch', async () => {
      const prisma = { processTemplateStage: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new ProcessTemplatesService(prisma as never);
      await expect(service.addTask({ tenantId: 't1', stageId: 's1', data: { title: '选婚纱' } as never })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates the task', async () => {
      const prisma = {
        processTemplateStage: { findUnique: vi.fn().mockResolvedValue({ id: 's1', template: { tenantId: 't1' } }) },
        processTemplateTask: { create: vi.fn().mockResolvedValue({ id: 't1' }) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.addTask({ tenantId: 't1', stageId: 's1', data: { title: '选婚纱', sortOrder: 0 } as never });
      expect(prisma.processTemplateTask.create).toHaveBeenCalledWith({
        data: { stageId: 's1', title: '选婚纱', sortOrder: 0 }
      });
    });
  });

  describe('updateTask', () => {
    it('throws NotFound when task is missing', async () => {
      const prisma = { processTemplateTask: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new ProcessTemplatesService(prisma as never);
      await expect(service.updateTask({ tenantId: 't1', taskId: 't1', data: {} })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the task', async () => {
      const prisma = {
        processTemplateTask: {
          findUnique: vi.fn().mockResolvedValue({ id: 't1', stage: { template: { tenantId: 't1' } } }),
          update: vi.fn().mockResolvedValue({ id: 't1' })
        }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.updateTask({ tenantId: 't1', taskId: 't1', data: { title: '新' } as never });
      expect(prisma.processTemplateTask.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { title: '新' } });
    });
  });

  describe('deleteTask', () => {
    it('deletes after validation', async () => {
      const prisma = {
        processTemplateTask: {
          findUnique: vi.fn().mockResolvedValue({ id: 't1', stage: { template: { tenantId: 't1' } } }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.deleteTask({ tenantId: 't1', taskId: 't1' });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('reorderTasks', () => {
    it('runs task sort updates in a transaction', async () => {
      const updateMock = vi.fn();
      const prisma = {
        processTemplateTask: { update: updateMock },
        $transaction: vi.fn((arr: Promise<unknown>[]) => Promise.all(arr))
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.reorderTasks({ tenantId: 't1', stageId: 's1', items: [{ id: 't1', sortOrder: 0 }] });
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('addChecklistItem', () => {
    it('creates a checklist item after task validation', async () => {
      const prisma = {
        processTemplateTask: { findUnique: vi.fn().mockResolvedValue({ id: 't1', stage: { template: { tenantId: 't1' } } }) },
        processTemplateChecklistItem: { create: vi.fn().mockResolvedValue({ id: 'ci1' }) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.addChecklistItem({ tenantId: 't1', taskId: 't1', data: { label: '确认时间' } as never });
      expect(prisma.processTemplateChecklistItem.create).toHaveBeenCalled();
    });
  });

  describe('deleteChecklistItem', () => {
    it('deletes after validation', async () => {
      const prisma = {
        processTemplateChecklistItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'ci1', task: { stage: { template: { tenantId: 't1' } } } }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.deleteChecklistItem({ tenantId: 't1', itemId: 'ci1' });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('getTaskAssignees', () => {
    it('returns assignees after task validation', async () => {
      const prisma = {
        processTemplateTask: { findUnique: vi.fn().mockResolvedValue({ id: 't1', stage: { template: { tenantId: 't1' } } }) },
        processTemplateTaskAssignee: { findMany: vi.fn().mockResolvedValue([]) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.getTaskAssignees({ tenantId: 't1', taskId: 't1' });
      expect(prisma.processTemplateTaskAssignee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { templateTaskId: 't1' } })
      );
    });
  });

  describe('addTaskAssignee', () => {
    it('creates assignee with member select', async () => {
      const prisma = {
        processTemplateTask: { findUnique: vi.fn().mockResolvedValue({ id: 't1', stage: { template: { tenantId: 't1' } } }) },
        processTemplateTaskAssignee: { create: vi.fn().mockResolvedValue({ id: 'ta1' }) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.addTaskAssignee({ tenantId: 't1', taskId: 't1', memberId: 'm1' });
      expect(prisma.processTemplateTaskAssignee.create).toHaveBeenCalledWith({
        data: { templateTaskId: 't1', memberId: 'm1' },
        include: expect.any(Object)
      });
    });
  });

  describe('removeTaskAssignee', () => {
    it('deletes by id', async () => {
      const prisma = { processTemplateTaskAssignee: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new ProcessTemplatesService(prisma as never);
      await service.removeTaskAssignee({ tenantId: 't1', id: 'ta1' });
      expect(prisma.processTemplateTaskAssignee.deleteMany).toHaveBeenCalledWith({ where: { id: 'ta1' } });
    });
  });

  describe('applyToProject', () => {
    it('creates stages and tasks from template without reset', async () => {
      const tpl = buildTemplate({
        stages: [{
          id: 's1', name: '筹备', description: null, sortOrder: 0,
          tasks: [{
            id: 't1', title: '选婚纱', description: null, assigneeType: 'planner',
            assignedRoleId: null, priority: 3, offsetDays: 7, sortOrder: 0, assignees: []
          }]
        }]
      });
      const project = { id: 'p1', createdAt: new Date('2026-01-01'), weddingDate: null };
      const tx = {
        project: { update: vi.fn() },
        projectStage: { create: vi.fn().mockResolvedValue({ id: 'new_s1' }) },
        task: { create: vi.fn().mockResolvedValue({ id: 'new_t1' }) },
        taskAssignee: { deleteMany: vi.fn(), createMany: vi.fn() },
        taskMaterial: { deleteMany: vi.fn() }
      };
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(tpl) },
        project: { findFirst: vi.fn().mockResolvedValue(project) },
        $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx))
      };
      const service = new ProcessTemplatesService(prisma as never);
      const result = await service.applyToProject({ tenantId: 't1', projectId: 'p1', templateId: 'tpl1' });
      expect(result.stages).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
      expect(tx.taskAssignee.deleteMany).not.toHaveBeenCalled();
    });

    it('resets all existing stages/tasks when reset=true', async () => {
      const tpl = buildTemplate();
      const project = { id: 'p1', createdAt: new Date('2026-01-01'), weddingDate: null };
      const tx = {
        project: { update: vi.fn() },
        projectStage: { deleteMany: vi.fn(), create: vi.fn() },
        task: { deleteMany: vi.fn(), create: vi.fn() },
        taskAssignee: { deleteMany: vi.fn() },
        taskMaterial: { deleteMany: vi.fn() }
      };
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(tpl) },
        project: { findFirst: vi.fn().mockResolvedValue(project) },
        $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx))
      };
      const service = new ProcessTemplatesService(prisma as never);
      await service.applyToProject({ tenantId: 't1', projectId: 'p1', templateId: 'tpl1', reset: true });
      expect(tx.taskAssignee.deleteMany).toHaveBeenCalled();
      expect(tx.taskMaterial.deleteMany).toHaveBeenCalled();
      expect(tx.task.deleteMany).toHaveBeenCalled();
      expect(tx.projectStage.deleteMany).toHaveBeenCalled();
    });

    it('throws NotFound when project does not exist', async () => {
      const prisma = {
        processTemplate: { findFirst: vi.fn().mockResolvedValue(buildTemplate()) },
        project: { findFirst: vi.fn().mockResolvedValue(null) }
      };
      const service = new ProcessTemplatesService(prisma as never);
      await expect(
        service.applyToProject({ tenantId: 't1', projectId: 'missing', templateId: 'tpl1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
