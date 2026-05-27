import { describe, expect, it, vi } from 'vitest';
import { LeadsOperationsService } from './leads-operations.service';

describe('LeadsOperationsService', () => {
  it('groups leads by pipeline status', async () => {
    const prisma = {
      lead: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'lead_1', status: 'new' },
          { id: 'lead_2', status: 'proposal' }
        ])
      }
    };
    const service = new LeadsOperationsService(prisma as never);

    const result = await service.pipeline({ tenantId: 'tenant_1' });

    expect(result.new).toHaveLength(1);
    expect(result.proposal).toHaveLength(1);
  });

  it('queries overdue followups inside current tenant', async () => {
    const now = new Date('2026-05-23T00:00:00.000Z');
    const prisma = {
      leadFollowup: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const service = new LeadsOperationsService(prisma as never);

    await service.overdueFollowups({ tenantId: 'tenant_1', now });

    expect(prisma.leadFollowup.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
        nextFollowUpAt: { lt: now },
        lead: {
          status: {
            notIn: ['won', 'lost']
          }
        }
      },
      include: { lead: true },
      orderBy: { nextFollowUpAt: 'asc' },
      take: 100
    });
  });
});
