import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProjectStagesService } from './project-stages.service';

describe('ProjectStagesService', () => {
  it('creates a project stage with tenant and project scope', async () => {
    const prisma = { projectStage: { create: vi.fn().mockResolvedValue({ id: 'stage_1' }) } };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new ProjectStagesService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: { name: '方案确认', sortOrder: 1 }
    });

    expect(prisma.projectStage.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        name: '方案确认',
        description: undefined,
        dueDate: undefined,
        sortOrder: 1
      }
    });
  });

  it('lists stages ordered by sortOrder asc', async () => {
    const prisma = { projectStage: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new ProjectStagesService(prisma as never, { record: vi.fn() } as never);
    await service.list({ tenantId: 't1', projectId: 'p1' });
    expect(prisma.projectStage.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', projectId: 'p1' },
      orderBy: { sortOrder: 'asc' }
    });
  });

  describe('update', () => {
    it('updates a stage and writes audit log', async () => {
      const stage = { id: 's1', projectId: 'p1' };
      const prisma = {
        projectStage: {
          findFirst: vi.fn().mockResolvedValue(stage),
          update: vi.fn().mockResolvedValue({ id: 's1' })
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ProjectStagesService(prisma as never, audit as never);

      await service.update({
        tenantId: 't1',
        userId: 'u1',
        stageId: 's1',
        data: { name: '新名称' }
      });

      expect(prisma.projectStage.update).toHaveBeenCalledWith({
        where: { id: 's1', tenantId: 't1' },
        data: expect.objectContaining({ name: '新名称' })
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'project_stage.update', entityId: 's1' })
      );
    });

    it('throws NotFound when stage does not exist', async () => {
      const prisma = { projectStage: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() } };
      const service = new ProjectStagesService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.update({ tenantId: 't1', userId: 'u1', stageId: 'missing', data: {} })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
