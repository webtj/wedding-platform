import { describe, expect, it, vi } from 'vitest';
import { ProjectStagesService } from './project-stages.service';

describe('ProjectStagesService', () => {
  it('creates a project stage with tenant and project scope', async () => {
    const prisma = { projectStage: { create: vi.fn().mockResolvedValue({ id: 'stage_1' }) } };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new ProjectStagesService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: { name: '方案确认', sortOrder: 1 }
    });

    expect(prisma.projectStage.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        name: '方案确认',
        description: undefined,
        dueDate: undefined,
        sortOrder: 1
      }
    });
  });
});
