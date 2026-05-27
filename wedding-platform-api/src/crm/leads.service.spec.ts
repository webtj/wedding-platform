import { describe, expect, it, vi } from 'vitest';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  it('creates a tenant-scoped lead and audit log', async () => {
    const prisma = {
      lead: {
        create: vi.fn().mockResolvedValue({ id: 'lead_1', tenantId: 'tenant_1' })
      }
    };
    const audit = { record: vi.fn().mockResolvedValue({ id: 'audit_1' }) };
    const service = new LeadsService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      data: { name: '李想', phone: '13800000000', sourceChannel: 'referral' as any }
    });

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        leadNo: expect.stringMatching(/^LD-[A-Z0-9]{8}-\d{8}$/),
        name: '李想',
        phone: '13800000000',
        sourceChannel: 'referral',
        weddingDate: undefined,
        note: undefined,
        createdByUserId: 'user_1'
      }
    });
    expect(audit.record).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      userId: 'user_1',
      action: 'lead.create',
      entity: 'lead',
      entityId: 'lead_1'
    });
  });

  it('lists leads only inside current tenant', async () => {
    const prisma = {
      lead: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0)
      }
    };
    const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

    await service.list({ tenantId: 'tenant_1' });

    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: {
        followups: { orderBy: { createdAt: 'desc' }, take: 1 },
        createdBy: { select: { displayName: true } },
        convertedProject: { select: { id: true } },
        contract: { select: { id: true, contractNo: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10
    });
  });
});
