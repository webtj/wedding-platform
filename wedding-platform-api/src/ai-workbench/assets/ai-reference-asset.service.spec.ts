import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiReferenceAssetService } from './ai-reference-asset.service';

const buildStorage = () => ({
  upload: vi.fn().mockResolvedValue({ url: 'http://api/uploads/ref.png', key: 't1/ref.png', size: 1024 }),
  delete: vi.fn().mockResolvedValue(undefined)
});

describe('AiReferenceAssetService', () => {
  describe('createFromFile', () => {
    it('uploads file and creates aiReferenceAsset record', async () => {
      const storage = buildStorage();
      const prisma = { aiReferenceAsset: { create: vi.fn().mockResolvedValue({ id: 'ra1' }) } };
      const service = new AiReferenceAssetService(prisma as never, storage as never);

      const file = { buffer: Buffer.from('img'), originalname: 'photo.png', mimetype: 'image/png', size: 1024 };
      const result = await service.createFromFile({
        tenantId: 't1', userId: 'u1', file, role: 'style_ref' as never
      });

      expect(storage.upload).toHaveBeenCalledWith(file.buffer, 'photo.png', 'image/png', 't1');
      expect(prisma.aiReferenceAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1', userId: 'u1', role: 'style_ref',
          url: 'http://api/uploads/ref.png', filename: 'photo.png',
          contentType: 'image/png', sizeBytes: 1024,
          metadata: { storageKey: 't1/ref.png' }
        })
      });
      expect(result).toEqual({ id: 'ra1' });
    });

    it('throws BadRequest when no file provided', async () => {
      const service = new AiReferenceAssetService({} as never, buildStorage() as never);
      await expect(
        service.createFromFile({ tenantId: 't1', userId: 'u1', file: null as never, role: 'style_ref' as never })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest for unsupported MIME type', async () => {
      const service = new AiReferenceAssetService({} as never, buildStorage() as never);
      const file = { buffer: Buffer.from('x'), originalname: 'x.pdf', mimetype: 'application/pdf', size: 100 };
      await expect(
        service.createFromFile({ tenantId: 't1', userId: 'u1', file, role: 'style_ref' as never })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when file exceeds max size', async () => {
      const service = new AiReferenceAssetService({} as never, buildStorage() as never);
      const file = { buffer: Buffer.alloc(21 * 1024 * 1024), originalname: 'big.png', mimetype: 'image/png', size: 21 * 1024 * 1024 };
      await expect(
        service.createFromFile({ tenantId: 't1', userId: 'u1', file, role: 'style_ref' as never })
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create', () => {
    it('creates a reference asset from data directly', async () => {
      const prisma = { aiReferenceAsset: { create: vi.fn().mockResolvedValue({ id: 'ra1' }) } };
      const service = new AiReferenceAssetService(prisma as never, buildStorage() as never);
      const data = { tenantId: 't1', userId: 'u1', role: 'style_ref' as never, url: 'http://img', filename: 'f.png', contentType: 'image/png', sizeBytes: 100 };
      await service.create(data);
      expect(prisma.aiReferenceAsset.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findById', () => {
    it('returns the asset when found', async () => {
      const asset = { id: 'ra1', tenantId: 't1' };
      const prisma = { aiReferenceAsset: { findFirst: vi.fn().mockResolvedValue(asset) } };
      const service = new AiReferenceAssetService(prisma as never, buildStorage() as never);
      expect(await service.findById('t1', 'ra1')).toEqual(asset);
    });

    it('throws NotFound when missing', async () => {
      const prisma = { aiReferenceAsset: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new AiReferenceAssetService(prisma as never, buildStorage() as never);
      await expect(service.findById('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('lists assets with optional projectId and conversationId filters', async () => {
      const prisma = { aiReferenceAsset: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new AiReferenceAssetService(prisma as never, buildStorage() as never);
      await service.list('t1', 'p1', 'c1');
      expect(prisma.aiReferenceAsset.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', projectId: 'p1', conversationId: 'c1' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('lists without filters when omitted', async () => {
      const prisma = { aiReferenceAsset: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new AiReferenceAssetService(prisma as never, buildStorage() as never);
      await service.list('t1');
      expect(prisma.aiReferenceAsset.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('delete', () => {
    it('deletes from storage when storageKey exists and removes DB record', async () => {
      const asset = { id: 'ra1', metadata: { storageKey: 't1/ref.png' } };
      const prisma = {
        aiReferenceAsset: {
          findFirst: vi.fn().mockResolvedValue(asset),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const storage = buildStorage();
      const service = new AiReferenceAssetService(prisma as never, storage as never);
      const result = await service.delete('t1', 'ra1');
      expect(storage.delete).toHaveBeenCalledWith('t1/ref.png');
      expect(result).toEqual({ deleted: true });
    });

    it('skips storage delete when no storageKey in metadata', async () => {
      const asset = { id: 'ra1', metadata: null };
      const prisma = {
        aiReferenceAsset: {
          findFirst: vi.fn().mockResolvedValue(asset),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const storage = buildStorage();
      const service = new AiReferenceAssetService(prisma as never, storage as never);
      await service.delete('t1', 'ra1');
      expect(storage.delete).not.toHaveBeenCalled();
    });
  });
});
