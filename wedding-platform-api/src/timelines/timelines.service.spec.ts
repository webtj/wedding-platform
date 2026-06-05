import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TimelinesService } from './timelines.service';

describe('TimelinesService', () => {
  it('lists timeline items for a project', async () => {
    const prisma = { weddingTimelineItem: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);

    await service.list({ tenantId: 'tenant_1', projectId: 'project_1' });

    expect(prisma.weddingTimelineItem.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
        projectId: 'project_1'
      },
      orderBy: [{ startTime: 'asc' }, { sortOrder: 'asc' }]
    });
  });

  it('creates timeline item with parsed start time', async () => {
    const prisma = {
      weddingTimelineItem: { create: vi.fn().mockResolvedValue({ id: 'timeline_1' }) }
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new TimelinesService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: {
        startTime: '2026-06-18T08:30:00.000Z',
        title: '新娘化妆',
        status: 'pending',
        sortOrder: 1
      }
    });

    expect(prisma.weddingTimelineItem.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalled();
  });

  describe('update', () => {
    it('updates an existing timeline item with coerced startTime', async () => {
      const prisma = {
        weddingTimelineItem: {
          findFirst: vi.fn().mockResolvedValue({ id: 'ti1', projectId: 'p1' }),
          update: vi.fn().mockResolvedValue({ id: 'ti1' })
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new TimelinesService(prisma as never, audit as never);

      await service.update({
        tenantId: 't1', userId: 'u1', timelineItemId: 'ti1',
        data: { title: '新', startTime: '2026-07-01T10:00:00.000Z' } as never
      });

      expect(prisma.weddingTimelineItem.update).toHaveBeenCalledWith({
        where: { id: 'ti1', tenantId: 't1' },
        data: expect.objectContaining({ title: '新', startTime: expect.any(Date) })
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'timeline_item.update', entityId: 'ti1' })
      );
    });

    it('throws NotFound when timeline item does not exist', async () => {
      const prisma = { weddingTimelineItem: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.update({ tenantId: 't1', userId: 'u1', timelineItemId: 'missing', data: {} })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('runs sortOrder updates in a transaction and returns the list', async () => {
      const updateMock = vi.fn();
      const prisma = {
        weddingTimelineItem: {
          updateMany: updateMock,
          findMany: vi.fn().mockResolvedValue([{ id: 'ti1' }])
        },
        $transaction: vi.fn((arr: Promise<unknown>[]) => Promise.all(arr))
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new TimelinesService(prisma as never, audit as never);

      const result = await service.reorder({
        tenantId: 't1', userId: 'u1', projectId: 'p1',
        data: { items: [{ id: 'ti1', sortOrder: 0 }, { id: 'ti2', sortOrder: 1 }] }
      });

      expect(updateMock).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'timeline_item.reorder', entityId: 'p1' })
      );
      expect(result).toEqual([{ id: 'ti1' }]);
    });
  });

  describe('delete', () => {
    it('deletes the item and writes audit log', async () => {
      const prisma = {
        weddingTimelineItem: {
          findFirst: vi.fn().mockResolvedValue({ id: 'ti1', projectId: 'p1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new TimelinesService(prisma as never, audit as never);

      const result = await service.delete({ tenantId: 't1', userId: 'u1', timelineItemId: 'ti1' });

      expect(result).toEqual({ success: true });
      expect(prisma.weddingTimelineItem.delete).toHaveBeenCalledWith({ where: { id: 'ti1' } });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'timeline_item.delete', entityId: 'ti1' })
      );
    });

    it('throws NotFound when timeline item does not exist', async () => {
      const prisma = { weddingTimelineItem: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.delete({ tenantId: 't1', userId: 'u1', timelineItemId: 'missing' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getCalendar', () => {
    it('returns month view with days, stats, projects, and tasks', async () => {
      const projects = [{
        id: 'p1', projectNo: 'PJ-1', brideName: '新娘', groomName: '新郎',
        venue: '酒店', weddingDate: new Date('2026-06-15T00:00:00Z'), status: 'active'
      }];
      const tasks = [{
        id: 't1', title: '确认宾客', dueDate: new Date('2026-06-10T00:00:00Z'),
        priority: 3, status: 'todo',
        project: { id: 'p1', brideName: '新娘', groomName: '新郎' }
      }];
      const prisma = {
        project: {
          findMany: vi.fn().mockResolvedValue(projects),
          count: vi.fn()
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(3)
        },
        task: {
          findMany: vi.fn().mockResolvedValue(tasks),
          count: vi.fn()
            .mockResolvedValueOnce(10)
            .mockResolvedValueOnce(4)
        }
      };
      const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);

      const result = await service.getCalendar({
        tenantId: 't1', date: '2026-06-01', view: 'month', mode: 'projects'
      });

      expect(result.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.monthStart).toBe('2026-06-01');
      expect(result.monthEnd).toBe('2026-06-30');
      expect(result.view).toBe('month');
      expect(result.stats).toEqual({ projects: 5, activeProjects: 3, pendingTasks: 10, doneTasks: 4 });
      expect(result.days).toHaveLength(30);
      const day15 = result.days.find((d) => d.date === '2026-06-15');
      expect(day15!.projects).toHaveLength(1);
      expect(day15!.projects[0]!.name).toBe('新娘 & 新郎');
      const day10 = result.days.find((d) => d.date === '2026-06-10');
      expect(day10!.tasks).toHaveLength(1);
      expect(day10!.tasks[0]!.projectName).toBe('新娘 & 新郎');
    });

    it('returns recent view with 30 days from anchor date', async () => {
      const prisma = {
        project: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
        task: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);
      const result = await service.getCalendar({ tenantId: 't1', date: '2026-06-01', view: 'recent', mode: 'projects' });
      expect(result.days).toHaveLength(30);
      expect(result.monthStart).toBe('2026-06-01');
      expect(result.monthEnd).toBe('2026-06-30');
    });

    it('flags weekend days correctly', async () => {
      const prisma = {
        project: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
        task: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);
      const result = await service.getCalendar({ tenantId: 't1', date: '2026-06-01', view: 'month', mode: 'projects' });
      const day6 = result.days.find((d) => d.date === '2026-06-06');
      expect(day6!.isWeekend).toBe(true);
      const day3 = result.days.find((d) => d.date === '2026-06-03');
      expect(day3!.isWeekend).toBe(false);
    });
  });
});
