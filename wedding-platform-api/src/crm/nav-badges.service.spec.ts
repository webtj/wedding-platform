import { describe, expect, it, vi } from 'vitest';
import { NavBadgesService } from './nav-badges.service';

describe('NavBadgesService', () => {
  it('counts active leads with no followup in the last 7 days', async () => {
    const prisma = {
      lead: { count: vi.fn().mockResolvedValue(7) }
    };
    const service = new NavBadgesService(prisma as never);

    const result = await service.getAll('tenant_1');

    expect(result).toEqual({
      badges: {
        'leads-needs-followup': { count: 7 }
      }
    });
    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
        deletedAt: null,
        status: { notIn: ['won', 'lost'] },
        followups: { none: { createdAt: { gte: expect.any(Date) } } }
      }
    });
    const callArg = prisma.lead.count.mock.calls[0]?.[0] as { where: { followups: { none: { createdAt: { gte: Date } } } } };
    expect(callArg).toBeDefined();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const actual = callArg!.where.followups.none.createdAt.gte.getTime();
    expect(Math.abs(actual - sevenDaysAgo.getTime())).toBeLessThan(5000);
  });
});
