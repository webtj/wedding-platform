import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaterialTypeService } from './material-type.service';

describe('MaterialTypeService', () => {
  describe('list', () => {
    it('queries system + tenant material types with search', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.list('t1', '请柬');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ isSystem: true, tenantId: null }, { tenantId: 't1' }],
            name: { contains: '请柬', mode: 'insensitive' }
          })
        })
      );
    });
  });

  describe('getById', () => {
    it('returns the material type', async () => {
      const mt = { id: 'mt1' };
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(mt) } };
      const service = new MaterialTypeService(prisma as never);
      expect(await service.getById('mt1')).toEqual(mt);
    });

    it('throws NotFound when missing', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a tenant-scoped material type with isSystem=false', async () => {
      const prisma = { materialType: { create: vi.fn().mockResolvedValue({ id: 'mt1' }) } };
      const service = new MaterialTypeService(prisma as never);
      await service.create('t1', { name: '请柬', code: 'invite' } as never);
      expect(prisma.materialType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isSystem: false, tenantId: 't1', name: '请柬' })
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when missing', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.update('missing', 't1', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest for system types', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: true, tenantId: null }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.update('mt1', 't1', { name: '新' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when tenant mismatch', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false, tenantId: 'other' }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.update('mt1', 't1', { name: '新' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates when tenant matches and not system', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false, tenantId: 't1' }),
          update: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.update('mt1', 't1', { name: '新名' } as never);
      expect(prisma.materialType.update).toHaveBeenCalledWith({ where: { id: 'mt1' }, data: { name: '新名' } });
    });
  });

  describe('delete', () => {
    it('throws NotFound when missing', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.delete('missing', 't1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest for system types', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: true, tenantId: null }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.delete('mt1', 't1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when tenant mismatch', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false, tenantId: 'other' }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.delete('mt1', 't1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes when tenant matches and not system', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', isSystem: false, tenantId: 't1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.delete('mt1', 't1');
      expect(prisma.materialType.delete).toHaveBeenCalledWith({ where: { id: 'mt1' } });
    });
  });
});
