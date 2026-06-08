import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaterialTypeService } from './material-type.service';
import type { TenantContext } from '../common/tenant-context';

const tenantCtx = (overrides?: Partial<TenantContext>): TenantContext => ({
  userId: 'u1',
  tenantId: 't1',
  memberId: 'm1',
  isPlatformAdmin: false,
  ...overrides
});

describe('MaterialTypeService', () => {
  describe('list', () => {
    it('queries tenant + built-in material types with search', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.list(tenantCtx(), '请柬');
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ tenantId: null }, { tenantId: 't1' }],
            name: { contains: '请柬', mode: 'insensitive' }
          }
        })
      );
    });

    it('sees all types as platform admin without search', async () => {
      const prisma = {
        materialType: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.list(tenantCtx({ isPlatformAdmin: true, tenantId: null }));
      expect(prisma.materialType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
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
    it('creates a tenant-scoped material type', async () => {
      const prisma = { materialType: { create: vi.fn().mockResolvedValue({ id: 'mt1' }) } };
      const service = new MaterialTypeService(prisma as never);
      await service.create(tenantCtx(), { name: '请柬', code: 'invite' } as never);
      expect(prisma.materialType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: 't1', name: '请柬' })
      });
    });

    it('creates a built-in material type when admin', async () => {
      const prisma = { materialType: { create: vi.fn().mockResolvedValue({ id: 'mt1' }) } };
      const service = new MaterialTypeService(prisma as never);
      await service.create(tenantCtx({ isPlatformAdmin: true, tenantId: null }), { name: '全局类型', code: 'global' } as never);
      expect(prisma.materialType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: null, name: '全局类型' })
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when missing', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.update('missing', tenantCtx(), {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest for built-in types', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: null }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.update('mt1', tenantCtx(), { name: '新' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when tenant mismatch', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: 'other' }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.update('mt1', tenantCtx(), { name: '新' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates when tenant matches', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: 't1' }),
          update: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.update('mt1', tenantCtx(), { name: '新名' } as never);
      expect(prisma.materialType.update).toHaveBeenCalledWith({ where: { id: 'mt1' }, data: { name: '新名' } });
    });

    it('allows admin to update built-in types', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: null }),
          update: vi.fn().mockResolvedValue({ id: 'mt1' })
        }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.update('mt1', tenantCtx({ isPlatformAdmin: true, tenantId: null }), { name: '新名' } as never);
      expect(prisma.materialType.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('throws NotFound when missing', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.delete('missing', tenantCtx())).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest for built-in types', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: null }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.delete('mt1', tenantCtx())).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when tenant mismatch', async () => {
      const prisma = { materialType: { findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: 'other' }) } };
      const service = new MaterialTypeService(prisma as never);
      await expect(service.delete('mt1', tenantCtx())).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes when tenant matches', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: 't1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.delete('mt1', tenantCtx());
      expect(prisma.materialType.delete).toHaveBeenCalledWith({ where: { id: 'mt1' } });
    });

    it('allows admin to delete built-in types', async () => {
      const prisma = {
        materialType: {
          findUnique: vi.fn().mockResolvedValue({ id: 'mt1', tenantId: null }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new MaterialTypeService(prisma as never);
      await service.delete('mt1', tenantCtx({ isPlatformAdmin: true, tenantId: null }));
      expect(prisma.materialType.delete).toHaveBeenCalledWith({ where: { id: 'mt1' } });
    });
  });
});
