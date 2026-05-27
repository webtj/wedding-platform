import { describe, expect, it, vi } from 'vitest';
import { AiVersionsService } from './ai-versions.service';

describe('AiVersionsService', () => {
  it('creates next output version', async () => {
    const prisma = {
      aiOutput: { findFirst: vi.fn().mockResolvedValue({ id: 'out_1', projectId: 'project_1' }) },
      aiOutputVersion: {
        findFirst: vi.fn().mockResolvedValue({ version: 2 }),
        create: vi.fn().mockResolvedValue({ id: 'version_3', version: 3 })
      }
    };
    const service = new AiVersionsService(prisma as never, {} as never, { record: vi.fn() } as never);

    const result = await service.createVersion({
      tenantId: 'tenant_1',
      userId: 'user_1',
      outputId: 'out_1',
      data: { title: '新版', content: '内容' }
    });

    expect(result.version).toBe(3);
    expect(prisma.aiOutputVersion.create).toHaveBeenCalledWith({
      data: {
        outputId: 'out_1',
        version: 3,
        title: '新版',
        content: '内容',
        note: undefined
      }
    });
  });
});
