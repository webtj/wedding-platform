import { describe, expect, it, vi } from 'vitest';
import { MiniProjectsService } from './mini-projects.service';

describe('MiniProjectsService', () => {
  it('lists projects for the authenticated couple user', async () => {
    const prisma = { project: { findMany: vi.fn().mockResolvedValue([{ id: 'project_1', brideName: 'A', groomName: 'B' }]) } };
    const service = new MiniProjectsService(prisma as never);
    const projects = await service.listForUser({ tenantId: 'tenant_1', userId: 'user_1' });
    expect(projects).toHaveLength(1);
  });
});
