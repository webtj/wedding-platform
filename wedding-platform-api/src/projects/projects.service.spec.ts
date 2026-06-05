import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  it('lists all projects for any user in the tenant', async () => {
    const prisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      }
    };
    const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

    const result = await service.listForUser({ tenantId: 'tenant_1' });

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: { members: true },
      orderBy: { weddingDate: 'asc' },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
  });

  it('respects custom page and pageSize', async () => {
    const prisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(50),
      }
    };
    const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

    const result = await service.listForUser({ tenantId: 'tenant_1', page: 3, pageSize: 10 });

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: { members: true },
      orderBy: { weddingDate: 'asc' },
      skip: 20,
      take: 10,
    });
    expect(result).toEqual({ items: [], total: 50, page: 3, pageSize: 10, totalPages: 5 });
  });

  describe('get', () => {
    it('returns the project with members, tasks, and assets', async () => {
      const project = { id: 'p1', tenantId: 't1', members: [], tasks: [], assets: [] };
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(project) }
      };
      const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

      const result = await service.get({ tenantId: 't1', userId: 'u1', projectId: 'p1' });
      expect(result).toEqual(project);
      expect(prisma.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1', tenantId: 't1' },
          include: expect.objectContaining({
            members: { include: { user: true } },
            tasks: { orderBy: { dueDate: 'asc' } },
            assets: { orderBy: { createdAt: 'desc' } }
          })
        })
      );
    });

    it('throws NotFound when the project does not exist', async () => {
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(null) }
      };
      const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

      await expect(
        service.get({ tenantId: 't1', userId: 'u1', projectId: 'missing' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getProjectTimeline', () => {
    it('returns project with daysUntilWedding, stages, and unassigned tasks', async () => {
      const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const project = {
        id: 'p1',
        projectNo: 'PJ-1',
        brideName: '新娘',
        groomName: '新郎',
        weddingDate: future,
        venue: '酒店',
        status: 'active',
        stages: [
          {
            id: 's1',
            name: '筹备',
            status: 'in_progress',
            sortOrder: 1,
            tasks: [
              { id: 't1', title: '选婚纱', status: 'todo', priority: 'high', dueDate: future, isBlocked: false, assigneeType: 'planner', assignees: [] }
            ]
          }
        ],
        tasks: [
          { id: 't2', title: '发请柬', status: 'todo', priority: 'normal', dueDate: null, isBlocked: false, assigneeType: 'couple', assignees: [] }
        ]
      };
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(project) }
      };
      const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

      const result = await service.getProjectTimeline('t1', 'p1');
      expect(result.project.id).toBe('p1');
      expect(result.daysUntilWedding).toBeGreaterThanOrEqual(29);
      expect(result.stages[0].tasks[0].daysUntilDue).toBeGreaterThanOrEqual(29);
      expect(result.unassignedTasks[0].daysUntilDue).toBeNull();
    });

    it('throws NotFound when the project does not exist', async () => {
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(null) }
      };
      const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

      await expect(service.getProjectTimeline('t1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
