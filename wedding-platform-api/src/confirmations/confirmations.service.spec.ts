import { describe, expect, it, vi } from 'vitest';
import { ConfirmationsService } from './confirmations.service';

describe('ConfirmationsService', () => {
  it('lists confirmations by tenant and project', async () => {
    const prisma = { confirmation: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new ConfirmationsService(prisma as never, { record: vi.fn() } as never, { create: vi.fn() } as never);

    await service.list({ tenantId: 'tenant_1', projectId: 'project_1' });

    expect(prisma.confirmation.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1', projectId: 'project_1' },
      include: { events: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  });
});
