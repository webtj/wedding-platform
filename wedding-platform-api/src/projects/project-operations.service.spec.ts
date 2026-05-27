import { describe, expect, it, vi } from 'vitest';
import { ProjectOperationsService } from './project-operations.service';

describe('ProjectOperationsService', () => {
  it('lists operational projects by tenant', async () => {
    const prisma = { project: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
    const service = new ProjectOperationsService(prisma as never, { record: vi.fn() } as never);

    await service.listOperations({ tenantId: 'tenant_1' });

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        contracts: { select: { id: true, contractNo: true } }
      },
      orderBy: [{ status: 'asc' }, { weddingDate: 'asc' }],
      skip: 0,
      take: 10
    });
  });
});
