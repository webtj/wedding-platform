import { describe, expect, it, vi } from 'vitest';
import { PublicCasesService } from './public-cases.service';

describe('PublicCasesService', () => {
  it('creates public case from project', async () => {
    const prisma = { project: { findFirst: vi.fn().mockResolvedValue({ id: 'project_1', tenantId: 'tenant_1' }) }, publicCase: { create: vi.fn().mockResolvedValue({ id: 'case_1', projectId: 'project_1', status: 'draft' }) } };
    const service = new PublicCasesService(prisma as never);
    const result = await service.createFromProject({ tenantId: 'tenant_1', userId: 'user_1', projectId: 'project_1', data: { title: '海边婚礼案例', content: '案例内容', status: 'draft' } });
    expect(result.id).toBe('case_1');
  });
});
