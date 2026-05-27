import { describe, expect, it, vi } from 'vitest';
import { AssetsService } from './assets.service';

describe('AssetsService preview intent', () => {
  it('creates preview intent from stored object key', async () => {
    const prisma = {
      asset: {
        findFirst: vi.fn().mockResolvedValue({ id: 'asset_1', objectKey: 'tenants/t/projects/p/assets/a/original' })
      }
    };
    const storage = {
      createPreviewIntent: vi.fn().mockReturnValue({
        objectKey: 'tenants/t/projects/p/assets/a/original',
        previewUrl: 'http://localhost/preview',
        method: 'GET',
        expiresAt: '2026-05-23T00:00:00.000Z'
      })
    };
    const service = new AssetsService(prisma as never, storage as never, { record: vi.fn() } as never);

    const result = await service.createPreviewIntent({ tenantId: 'tenant_1', assetId: 'asset_1' });

    expect(result.preview.previewUrl).toBe('http://localhost/preview');
    expect(storage.createPreviewIntent).toHaveBeenCalledWith({ objectKey: 'tenants/t/projects/p/assets/a/original' });
  });
});
