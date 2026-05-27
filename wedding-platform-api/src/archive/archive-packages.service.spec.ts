import { describe, expect, it, vi } from 'vitest';
import { ArchivePackagesService } from './archive-packages.service';

describe('ArchivePackagesService', () => {
  it('creates a ready archive package and stores zip', async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'project_1',
          brideName: '李想',
          groomName: '周安',
          weddingDate: new Date('2026-06-18T00:00:00.000Z'),
          assets: [{ id: 'asset_1', filename: 'design.png', objectKey: 'key_1' }],
          aiOutputs: [{ title: '案例文案', content: '内容' }]
        })
      },
      archivePackage: {
        create: vi.fn().mockResolvedValue({ id: 'pkg_1' }),
        update: vi.fn().mockResolvedValue({ id: 'pkg_1', status: 'ready' })
      }
    };
    const storage = { putObject: vi.fn().mockResolvedValue({ objectKey: 'zip_key', sizeBytes: 100 }) };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new ArchivePackagesService(prisma as never, storage as never, audit as never);

    const result = await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: {
        type: 'couple_delivery',
        title: '新人交付资料包',
        includeAssets: true,
        includeContracts: false,
        includeAiOutputs: true,
        expiresInDays: 30
      }
    });

    expect(result).toEqual({ id: 'pkg_1', status: 'ready' });
    expect(storage.putObject).toHaveBeenCalled();
  });
});
