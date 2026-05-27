import { describe, expect, it, vi } from 'vitest';
import { CoupleDashboardService } from './couple-dashboard.service';

describe('CoupleDashboardService', () => {
  it('returns empty dashboard when couple has no project', async () => {
    const service = new CoupleDashboardService({} as never, {
      listCoupleProjects: vi.fn().mockResolvedValue([])
    } as never);

    await expect(service.dashboard({ tenantId: 'tenant_1', userId: 'user_1' })).resolves.toEqual({
      activeProject: null,
      projects: [],
      progress: null,
      attention: []
    });
  });

  it('calculates progress percentage from task confirmation and stage counts', async () => {
    const prisma = {
      task: { count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1) },
      confirmation: { count: vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(1) },
      projectStage: { count: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(1) }
    };
    const service = new CoupleDashboardService(prisma as never, {
      requireCoupleProject: vi.fn().mockResolvedValue({ id: 'project_1' })
    } as never);

    const result = await service.progress({ tenantId: 'tenant_1', userId: 'user_1', projectId: 'project_1' });

    expect(result.percent).toBe(60);
    expect(result.total).toBe(5);
    expect(result.done).toBe(3);
  });
});
