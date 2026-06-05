import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProjectOperationsService } from './project-operations.service';

describe('ProjectOperationsService', () => {
  it('lists operational projects by tenant', async () => {
    const prisma = { project: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
    const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);

    await service.listOperations({ tenantId: 'tenant_1' });

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        contracts: { select: { id: true, contractNo: true } }
      },
      orderBy: [{ status: 'asc' }, { weddingDate: 'asc' }],
      skip: 0,
      take: 10
    });
  });

  it('applies status and search filters', async () => {
    const prisma = { project: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
    const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);
    await service.listOperations({ tenantId: 't1', status: 'active', search: '王' });
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1',
          status: 'active',
          OR: [
            { projectNo: { contains: '王' } },
            { brideName: { contains: '王' } },
            { groomName: { contains: '王' } },
            { venue: { contains: '王' } }
          ]
        })
      })
    );
  });

  describe('update', () => {
    it('updates an existing project and writes audit log', async () => {
      const prisma = {
        project: {
          findFirst: vi.fn().mockResolvedValue({ id: 'p1' }),
          update: vi.fn().mockResolvedValue({ id: 'p1', brideName: '新' })
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ProjectOperationsService(prisma as never, audit as never);

      await service.update({
        tenantId: 't1',
        userId: 'u1',
        projectId: 'p1',
        data: { brideName: '新' }
      });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'p1', tenantId: 't1' },
        data: expect.objectContaining({ brideName: '新' })
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'project.update', entityId: 'p1' })
      );
    });

    it('throws NotFound when project does not exist', async () => {
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() }
      };
      const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.update({ tenantId: 't1', userId: 'u1', projectId: 'missing', data: {} })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createFromContract', () => {
    it('creates a project + binds to contract + adds planner member in a transaction', async () => {
      const tx = {
        project: { create: vi.fn().mockResolvedValue({ id: 'proj_1', projectNo: 'PJ-X' }) },
        contract: { update: vi.fn().mockResolvedValue({}) }
      };
      const prisma = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1', leadId: 'l1' })
        },
        $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx))
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ProjectOperationsService(prisma as never, audit as never);

      const result = await service.createFromContract({
        tenantId: 't1',
        userId: 'u1',
        memberId: 'm1',
        contractId: 'c1',
        data: {
          brideName: '新娘',
          groomName: '新郎',
          weddingDate: '2026-10-10',
          ceremonyType: 'traditional'
        }
      });

      expect(result).toEqual({ id: 'proj_1', projectNo: 'PJ-X' });
      expect(tx.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 't1',
            leadId: 'l1',
            brideName: '新娘',
            groomName: '新郎',
            plannerId: undefined
          })
        })
      );
      expect(tx.contract.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { projectId: 'proj_1' }
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'project.create_from_contract' })
      );
    });

    it('throws NotFound when contract does not exist', async () => {
      const prisma = {
        contract: { findFirst: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn()
      };
      const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.createFromContract({
          tenantId: 't1',
          userId: 'u1',
          memberId: 'm1',
          contractId: 'missing',
          data: { brideName: 'A', groomName: 'B', weddingDate: '2026-10-10' }
        })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('kanban', () => {
    it('returns stages with taskCount and doneCount', async () => {
      const stages = [
        { id: 's1', name: '筹备', tasks: [{ id: 't1', status: 'done' }, { id: 't2', status: 'todo' }] },
        { id: 's2', name: '执行', tasks: [{ id: 't3', status: 'done' }] }
      ];
      const prisma = { projectStage: { findMany: vi.fn().mockResolvedValue(stages) } };
      const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);

      const result = await service.kanban({ tenantId: 't1', projectId: 'p1' });

      expect(result.stages[0]).toEqual(expect.objectContaining({ id: 's1', taskCount: 2, doneCount: 1 }));
      expect(result.stages[1]).toEqual(expect.objectContaining({ id: 's2', taskCount: 1, doneCount: 1 }));
    });
  });

  describe('dashboard', () => {
    it('aggregates task counts and progress percentage', async () => {
      const project = {
        id: 'p1',
        projectNo: 'PJ-1',
        brideName: 'A',
        groomName: 'B',
        weddingDate: new Date(Date.now() + 30 * 86400000),
        venue: '酒店',
        status: 'active',
        stages: [
          {
            id: 's1',
            name: '筹备',
            status: 'active',
            tasks: [
              { id: 't1', status: 'done', isBlocked: false, dueDate: null },
              { id: 't2', status: 'todo', isBlocked: true, dueDate: new Date(Date.now() - 86400000) },
              { id: 't3', status: 'todo', isBlocked: false, dueDate: null }
            ]
          }
        ]
      };
      const prisma = { project: { findFirst: vi.fn().mockResolvedValue(project) } };
      const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);

      const result = await service.dashboard({ tenantId: 't1', projectId: 'p1' });

      expect(result.overallProgress).toBe(33);
      expect(result.blockedCount).toBe(1);
      expect(result.overdueCount).toBe(1);
      expect(result.activeStage).toEqual({ id: 's1', name: '筹备' });
      expect(result.weddingDaysRemaining).toBeGreaterThanOrEqual(29);
    });

    it('returns 0 progress when no tasks', async () => {
      const project = {
        id: 'p1',
        projectNo: 'PJ-1',
        brideName: 'A',
        groomName: 'B',
        weddingDate: null,
        venue: '',
        status: 'pending',
        stages: []
      };
      const prisma = { project: { findFirst: vi.fn().mockResolvedValue(project) } };
      const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);
      const result = await service.dashboard({ tenantId: 't1', projectId: 'p1' });
      expect(result.overallProgress).toBe(0);
      expect(result.weddingDaysRemaining).toBeNull();
    });

    it('throws NotFound when project does not exist', async () => {
      const prisma = { project: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.dashboard({ tenantId: 't1', projectId: 'missing' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
