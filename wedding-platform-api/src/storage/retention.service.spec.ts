import { describe, expect, it, vi } from 'vitest';
import { RetentionService } from './retention.service';

describe('RetentionService', () => {
  it('upserts project retention policy', async () => {
    const prisma = {
      project: { findFirst: vi.fn().mockResolvedValue({ id: 'project_1' }) },
      assetRetentionPolicy: { upsert: vi.fn().mockResolvedValue({ id: 'policy_1' }) }
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new RetentionService(prisma as never, audit as never);

    await service.upsertPolicy({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: { retentionDays: 365, archiveAfterDays: 30, notifyBeforeDays: 15 }
    });

    expect(prisma.assetRetentionPolicy.upsert).toHaveBeenCalledWith({
      where: { projectId: 'project_1' },
      update: { retentionDays: 365, archiveAfterDays: 30, notifyBeforeDays: 15 },
      create: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        retentionDays: 365,
        archiveAfterDays: 30,
        notifyBeforeDays: 15
      }
    });
  });
});
