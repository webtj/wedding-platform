import { describe, expect, it, vi } from 'vitest';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
  it('lists all tenants for platform admin', async () => {
    const prisma = {
      tenant: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const service = new TenantsService(prisma as never);

    await service.listForUser({ userId: 'user_1', isPlatformAdmin: true });

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' }
    });
  });

  it('lists only member tenants for normal users', async () => {
    const prisma = {
      tenant: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const service = new TenantsService(prisma as never);

    await service.listForUser({ userId: 'user_1', isPlatformAdmin: false });

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
