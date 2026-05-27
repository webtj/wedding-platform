import { describe, expect, it, vi } from 'vitest';
import { SuperTenantsService } from './super-tenants.service';

describe('SuperTenantsService', () => {
  it('lists tenants with member and project counts', async () => {
    const prisma = { tenant: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
    const service = new SuperTenantsService(prisma as never);

    const result = await service.list();

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        _count: {
          select: { members: true, projects: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10
    });
    expect(result.total).toBe(0);
  });
});
