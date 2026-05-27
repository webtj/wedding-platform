import { describe, expect, it, vi } from 'vitest';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  it('creates a package with JSON features', async () => {
    const prisma = {
      planPackage: {
        create: vi.fn().mockResolvedValue({ id: 'plan_1', code: 'growth', features: ['crm'] })
      }
    };
    const service = new PlansService(prisma as never);
    const result = await service.create({
      code: 'growth', name: '成长版', monthlyPriceCents: 199900, yearlyPriceCents: 1999000,
      maxProjects: 80, maxMembers: 12, storageGb: 200, aiCreditsMonthly: 2000,
      features: ['crm', 'timeline'], status: 'active', sortOrder: 20
    });
    expect(result.id).toBe('plan_1');
  });
});
