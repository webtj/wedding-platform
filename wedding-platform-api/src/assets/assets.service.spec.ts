import { describe, expect, it, vi } from 'vitest';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  it('creates an upload intent and stores object key', async () => {
    const assetMethods = {
      create: vi.fn().mockResolvedValue({ id: 'asset_1' }),
      update: vi.fn().mockResolvedValue({ id: 'asset_1', objectKey: 'key_1' })
    };
    const tx = { asset: assetMethods };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (transaction: unknown) => unknown) => fn(tx)),
      asset: assetMethods
    };
    const storage = {
      createUploadIntent: vi.fn().mockReturnValue({
        objectKey: 'key_1',
        uploadUrl: 'http://localhost/upload',
        method: 'PUT',
        headers: { 'content-type': 'image/png' },
        expiresAt: '2026-05-22T00:00:00.000Z'
      })
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new AssetsService(prisma as never, storage as never, audit as never);

    const result = await service.createUploadIntent({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: { filename: 'design.png', contentType: 'image/png', sizeBytes: 100 }
    });

    expect(result.upload.objectKey).toBe('key_1');
    expect(tx.asset.update).toHaveBeenCalled();
  });
});
