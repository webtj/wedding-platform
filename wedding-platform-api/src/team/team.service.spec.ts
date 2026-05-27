import { describe, expect, it, vi } from 'vitest';
import { TeamService } from './team.service';

describe('TeamService', () => {
  it('lists members inside tenant with roles', async () => {
    const prisma = { tenantMember: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new TeamService(prisma as never);

    await service.listMembers({ tenantId: 'tenant_1' });

    expect(prisma.tenantMember.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1' },
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  });
});
