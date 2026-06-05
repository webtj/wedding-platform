import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
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

  it('list excludes soft-deleted assets', async () => {
    const prisma = { asset: { findMany: vi.fn().mockResolvedValue([]) } };
    const service = new AssetsService(prisma as never, {} as never, { record: vi.fn() } as never);
    await service.list({ tenantId: 't1', projectId: 'p1' });
    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', projectId: 'p1', status: { not: 'deleted' } },
      orderBy: { createdAt: 'desc' }
    });
  });

  describe('markReady', () => {
    it('flips status to ready via updateMany + writes audit log', async () => {
      const prisma = { asset: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new AssetsService(prisma as never, {} as never, audit as never);

      await service.markReady({ tenantId: 't1', userId: 'u1', assetId: 'asset_1' });
      expect(prisma.asset.updateMany).toHaveBeenCalledWith({
        where: { id: 'asset_1', tenantId: 't1' },
        data: { status: 'ready' }
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'asset.mark_ready', entityId: 'asset_1' })
      );
    });
  });

  describe('annotations (removed module)', () => {
    it('listAnnotations resolves empty array', async () => {
      const service = new AssetsService({} as never, {} as never, { record: vi.fn() } as never);
      await expect(service.listAnnotations({ tenantId: 't1', assetId: 'a1' })).resolves.toEqual([]);
    });

    it('createAnnotation throws NotFound', async () => {
      const service = new AssetsService({} as never, {} as never, { record: vi.fn() } as never);
      await expect(service.createAnnotation()).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updateAnnotation throws NotFound', async () => {
      const service = new AssetsService({} as never, {} as never, { record: vi.fn() } as never);
      await expect(service.updateAnnotation()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createPreviewIntent', () => {
    it('returns asset + storage preview intent', async () => {
      const asset = { id: 'a1', objectKey: 'key_1' };
      const prisma = { asset: { findFirst: vi.fn().mockResolvedValue(asset) } };
      const storage = {
        createPreviewIntent: vi.fn().mockReturnValue({
          previewUrl: 'http://localhost/preview',
          expiresAt: '2026-05-22T00:00:00.000Z'
        })
      };
      const service = new AssetsService(prisma as never, storage as never, { record: vi.fn() } as never);

      const result = await service.createPreviewIntent({ tenantId: 't1', assetId: 'a1' });
      expect(result.asset).toEqual(asset);
      expect(result.preview.previewUrl).toBe('http://localhost/preview');
      expect(storage.createPreviewIntent).toHaveBeenCalledWith({ objectKey: 'key_1' });
    });

    it('throws NotFound when asset does not exist', async () => {
      const prisma = { asset: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new AssetsService(prisma as never, {} as never, { record: vi.fn() } as never);
      await expect(
        service.createPreviewIntent({ tenantId: 't1', assetId: 'missing' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
