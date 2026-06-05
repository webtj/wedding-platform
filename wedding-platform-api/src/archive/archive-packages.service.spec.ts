import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ArchivePackagesService } from './archive-packages.service';

const buildStorage = () => ({
  putObject: vi.fn().mockResolvedValue({ objectKey: 'key', sizeBytes: 1024 }),
  createDownloadIntent: vi.fn().mockReturnValue({ downloadUrl: 'http://download', expiresAt: new Date() })
});

describe('ArchivePackagesService', () => {
  describe('list', () => {
    it('returns archive packages for a project with items and assets', async () => {
      const prisma = { archivePackage: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new ArchivePackagesService(prisma as never, buildStorage() as never, { record: vi.fn() } as never);
      await service.list({ tenantId: 't1', projectId: 'p1' });
      expect(prisma.archivePackage.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', projectId: 'p1' },
        include: { items: { include: { asset: true } } },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('create', () => {
    it('throws NotFound when project does not exist', async () => {
      const prisma = { project: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ArchivePackagesService(prisma as never, buildStorage() as never, { record: vi.fn() } as never);
      await expect(
        service.create({ tenantId: 't1', userId: 'u1', projectId: 'p1', data: { type: 'full', title: 'T', expiresInDays: 7 } as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a zip archive with README, assets, aiOutputs, and contracts', async () => {
      const project = {
        id: 'p1',
        brideName: '新娘',
        groomName: '新郎',
        weddingDate: new Date('2026-10-10'),
        assets: [{ id: 'a1', filename: 'photo.png', objectKey: 'k1' }],
        aiOutputs: [{ title: '誓词', content: '内容' }],
        contracts: [{ id: 'c1', contractNo: 'HT-001' }]
      };
      const pkg = { id: 'pkg1', status: 'processing' };
      const ready = { id: 'pkg1', status: 'ready' };
      const tx = {
        archivePackage: {
          create: vi.fn().mockResolvedValue(pkg),
          update: vi.fn().mockResolvedValue(ready)
        }
      };
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(project) },
        archivePackage: { create: vi.fn().mockResolvedValue(pkg), update: vi.fn().mockResolvedValue(ready) }
      };
      const storage = buildStorage();
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ArchivePackagesService(prisma as never, storage as never, audit as never);

      const result = await service.create({
        tenantId: 't1', userId: 'u1', projectId: 'p1',
        data: { type: 'full', title: '资料包', expiresInDays: 7, includeAssets: true, includeAiOutputs: true, includeContracts: true } as never
      });

      expect(prisma.archivePackage.create).toHaveBeenCalled();
      expect(storage.putObject).toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'archive_package.create', entityId: 'pkg1' })
      );
      expect(result).toEqual(ready);
    });
  });

  describe('downloadIntent', () => {
    it('throws NotFound when package is not ready', async () => {
      const prisma = { archivePackage: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ArchivePackagesService(prisma as never, buildStorage() as never, { record: vi.fn() } as never);
      await expect(
        service.downloadIntent({ tenantId: 't1', packageId: 'pkg1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns package and download intent when ready', async () => {
      const pkg = { id: 'pkg1', title: '资料包', objectKey: 'key' };
      const prisma = { archivePackage: { findFirst: vi.fn().mockResolvedValue(pkg) } };
      const storage = buildStorage();
      const service = new ArchivePackagesService(prisma as never, storage as never, { record: vi.fn() } as never);

      const result = await service.downloadIntent({ tenantId: 't1', packageId: 'pkg1' });
      expect(result.package).toEqual(pkg);
      expect(result.download.downloadUrl).toBe('http://download');
      expect(storage.createDownloadIntent).toHaveBeenCalledWith({
        objectKey: 'key',
        filename: '资料包.zip'
      });
    });
  });
});
