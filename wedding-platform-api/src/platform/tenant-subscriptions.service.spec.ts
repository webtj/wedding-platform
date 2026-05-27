import { describe, expect, it, vi } from 'vitest';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';

describe('TenantSubscriptionsService', () => {
  it('computes current usage from tenant data', async () => {
    const prisma = {
      tenant: { findUnique: vi.fn().mockResolvedValue({ id: 'tenant_1', projects: [{ id: 'p1' }, { id: 'p2' }], members: [{ id: 'm1' }], subscription: { planPackage: { maxProjects: 10, maxMembers: 5, storageGb: 20, aiCreditsMonthly: 100 } } }) },
      asset: { aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: 1024 } }) },
      aiJob: { count: vi.fn().mockResolvedValue(3) }
    };
    const service = new TenantSubscriptionsService(prisma as never);
    const usage = await service.usage('tenant_1');
    expect(usage.projectCount).toBe(2);
    expect(usage.aiCreditsUsed).toBe(3);
  });
});
