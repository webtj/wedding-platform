import { describe, expect, it, vi } from 'vitest';
import { TimelinesService } from './timelines.service';

describe('TimelinesService', () => {
  it('lists only couple-visible timeline items when requested', async () => {
    const prisma = { weddingTimelineItem: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new TimelinesService(prisma as never, { record: vi.fn() } as never);

    await service.list({ tenantId: 'tenant_1', projectId: 'project_1', coupleOnly: true });

    expect(prisma.weddingTimelineItem.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        visibleToCouple: true
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
        sortOrder: 1,
        visibleToCouple: true
      }
    });

    expect(prisma.weddingTimelineItem.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalled();
  });
});
