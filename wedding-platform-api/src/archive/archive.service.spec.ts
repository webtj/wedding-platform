import { describe, expect, it, vi } from 'vitest';
import { ArchiveService } from './archive.service';

describe('ArchiveService', () => {
  it('marks project completed and writes audit log', async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'project_1' }),
        update: vi.fn().mockResolvedValue({ id: 'project_1', status: 'completed' })
      }
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new ArchiveService(prisma as never, audit as never);

    await service.completeProject({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: { note: '婚礼已完成' }
    });

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project_1' },
      data: {
        status: 'completed',
        completedAt: expect.any(Date),
        archiveNote: '婚礼已完成'
      }
    });
    expect(audit.record).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      userId: 'user_1',
      action: 'project.complete',
      entity: 'project',
      entityId: 'project_1',
      metadata: { projectId: 'project_1' }
    });
  });
});
