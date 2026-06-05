import { describe, expect, it, vi } from 'vitest';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  it('lists only member tenants for users', async () => {
    const prisma = {
      tenant: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const service = new TenantsService(prisma as never);

    await service.listForUser({ userId: 'user_1' });

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: {
        members: {
          some: {
            userId: 'user_1',
            status: 'active'
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  });
});
