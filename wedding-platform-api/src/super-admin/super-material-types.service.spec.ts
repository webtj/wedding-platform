import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SuperMaterialTypesService } from './super-material-types.service';

describe('SuperMaterialTypesService', () => {
  describe('list', () => {
    it('queries built-in types when tenantId=__platform__', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.list('__platform__');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: null })
        })
      );
    });

    it('queries tenant-specific types when tenantId is a real id', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.list('t1');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 't1' })
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
    it('inserts a built-in material type with tenantId=null', async () => {
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

    it('updates any type (system or custom) for super admin', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false }),
          update: vi.fn().mockResolvedValue({ id: 'mt1', name: '新' })
        }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      const result = await service.update('mt1', { name: '新' } as never);
      expect(result).toEqual({ id: 'mt1', name: '新' });
    });

    it('updates only the fields provided, preserving the rest', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1' }),
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

    it('deletes any type (system or custom) for super admin', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false }),
          delete: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      const result = await service.delete('mt1');
      expect(result).toEqual({ id: 'mt1' });
    });

    it('deletes the system type', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1' }),
          delete: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new SuperMaterialTypesService(prisma as never);
      await service.delete('mt1');
      expect(prisma.materialType.delete).toHaveBeenCalledWith({ where: { id: 'mt1' } });
    });
  });
});
