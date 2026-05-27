import { describe, expect, it, vi } from 'vitest';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  it('lists tenant and platform roles', async () => {
    const prisma = { role: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) } };
    const service = new RolesService(prisma as never);

    await service.list({ tenantId: 'tenant_1', page: 1, pageSize: 10 });

    expect(prisma.role.findMany).toHaveBeenCalled();
  });
});
