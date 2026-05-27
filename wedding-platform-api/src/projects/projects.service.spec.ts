import { describe, expect, it, vi } from 'vitest';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  it('lists only projects where current user is a member', async () => {
    const prisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const service = new ProjectsService(prisma as never, { record: vi.fn() } as never, {} as never);

    await service.listForUser({ tenantId: 'tenant_1', userId: 'user_1' });

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: { members: true },
      orderBy: { weddingDate: 'asc' }
    });
  });
});
