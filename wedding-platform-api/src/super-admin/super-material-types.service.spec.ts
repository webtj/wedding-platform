import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SuperMaterialTypesService } from './super-material-types.service';

describe('SuperMaterialTypesService', () => {
  describe('list', () => {
    it('queries system-only material types when tenantId=__platform__', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.list('__platform__');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isSystem: true })
        })
      );
    });

    it('queries tenant-only types when tenantId is a real id', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.list('t1');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1', isSystem: false })
        })
      );
    });

    it('adds an insensitive name search filter', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.list('t1', '婚礼');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ name: { contains: '婚礼', mode: 'insensitive' } })
        })
      );
    });

    it('paginates with default 20/page', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.list('t1', undefined, 2, 50);
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 })
      );
    });
  });

  describe('create', () => {
    it('inserts a system-built-in material type with tenantId=null', async () => {
      const prisma = { materialType: { create: vi.fn().mockResolvedValue({ id: 'mt1' }) } };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.create({ name: '请柬', code: 'invite' } as never);
      expect(prisma.materialType.create).toHaveBeenCalledWith({
        data: {
          name: '请柬',
          code: 'invite',
          icon: undefined,
          defaultSize: undefined,
          sizes: undefined,
          isSystem: true,
          tenantId: null
        }
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when material type does not exist', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new SuperMaterialTypesService(prisma as never);
      await expect(service.update('missing', { name: '新' } as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when updating a non-system type', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false }) } };
      const service = new SuperMaterialTypesService(prisma as never);
      await expect(service.update('mt1', { name: '新' } as never)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates only the fields provided, preserving the rest', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: true }),
          update: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.update('mt1', { name: '新名' } as never);
      expect(prisma.materialType.update).toHaveBeenCalledWith({
        where: { id: 'mt1' },
        data: { name: '新名' }
      });
    });
  });

  describe('delete', () => {
    it('throws NotFound when material type does not exist', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new SuperMaterialTypesService(prisma as never);
      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when deleting a non-system type', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false }) } };
      const service = new SuperMaterialTypesService(prisma as never);
      await expect(service.delete('mt1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes the system type', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: true }),
          delete: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.delete('mt1');
      expect(prisma.materialType.delete).toHaveBeenCalledWith({ where: { id: 'mt1' } });
    });
  });
});
