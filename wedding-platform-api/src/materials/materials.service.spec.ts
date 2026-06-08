import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import type { TenantContext } from '../common/tenant-context';
import { MaterialsService } from './materials.service';

function ctx(tenantId: string | null, overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: overrides.userId ?? 'u1',
    tenantId,
    memberId: tenantId ? 'm1' : null,
    isPlatformAdmin: overrides.isPlatformAdmin ?? false,
    ...overrides
  };
}

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    materialCategory: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0)
    },
    material: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    taskMaterial: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    task: {
      findFirst: vi.fn().mockResolvedValue(null)
    },
    ...overrides
  };
}

function makeAudit() {
  return { record: vi.fn().mockResolvedValue(undefined) };
}

describe('MaterialsService', () => {
  describe('listCategories', () => {
    it('returns categories ordered by sortOrder for tenant', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findMany: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Floral' }])
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.listCategories(ctx('t1'));

      expect(result).toEqual([{ id: 'c1', name: 'Floral' }]);
      expect(prisma.materialCategory.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { tenantId: null },
            { tenantId: 't1' }
          ]
        },
        orderBy: { sortOrder: 'asc' },
        include: {
          materials: {
            where: {
              OR: [
                { tenantId: null },
                { tenantId: 't1' }
              ]
            },
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
    });

    it('returns ALL categories when platform admin', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findMany: vi.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.listCategories(ctx(null, { isPlatformAdmin: true }));

      expect(result).toHaveLength(2);
      expect(prisma.materialCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('createCategory', () => {
    it('passes tenantId and data into create', async () => {
      const created = { id: 'c1', name: 'Floral' };
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(created)
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.createCategory(ctx('t1'), { name: 'Floral', sortOrder: 1 } as never);

      expect(result).toEqual(created);
      expect(prisma.materialCategory.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', name: 'Floral', sortOrder: 1 }
      });
    });

    it('rejects duplicate name within same tenant with 409', async () => {
      const prisma = makePrisma({
        materialCategory: { findFirst: vi.fn().mockResolvedValue({ id: 'c1', name: 'Floral' }) }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      try {
        await service.createCategory(ctx('t1'), { name: 'Floral', sortOrder: 1 } as never);
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).statusCode).toBe(409);
        expect((e as AppError).message).toContain('Floral');
      }
    });

    it('records audit on successful create', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'c1', name: 'Floral' })
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      await service.createCategory(ctx('t1'), { name: 'Floral', sortOrder: 1 } as never);

      expect(audit.record).toHaveBeenCalledWith({
        tenantId: 't1',
        userId: 'u1',
        action: 'material_category.create',
        entity: 'material_category',
        entityId: 'c1',
        metadata: { name: 'Floral' }
      });
    });

    it('does NOT record audit when duplicate is rejected', async () => {
      const prisma = makePrisma({
        materialCategory: { findFirst: vi.fn().mockResolvedValue({ id: 'c1', name: 'Floral' }) }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      await expect(
        service.createCategory(ctx('t1'), { name: 'Floral', sortOrder: 1 } as never)
      ).rejects.toBeInstanceOf(AppError);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('allows platform admin to create built-in category', async () => {
      const created = { id: 'c1', name: 'BuiltIn' };
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(created)
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.createCategory(ctx(null, { isPlatformAdmin: true }), { name: 'BuiltIn' } as never);

      expect(result).toEqual(created);
      expect(prisma.materialCategory.create).toHaveBeenCalledWith({
        data: { tenantId: null, name: 'BuiltIn' }
      });
    });
  });

  describe('updateCategory', () => {
    it('updates the category when it belongs to the tenant', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ id: 'c1', name: 'Old', tenantId: 't1' })
            .mockResolvedValueOnce(null),
          update: vi.fn().mockResolvedValue({ id: 'c1', name: 'Updated' })
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.updateCategory(ctx('t1'), 'c1', { name: 'Updated' } as never);

      expect(result).toEqual({ id: 'c1', name: 'Updated' });
      expect(audit.record).toHaveBeenCalled();
    });

    it('throws NotFound when category does not exist', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.updateCategory(ctx('t1'), 'c1', {} as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects rename that collides with another category in same tenant', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ id: 'c1', name: 'Old', tenantId: 't1' })
            .mockResolvedValueOnce({ id: 'c2', name: 'New' })
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.updateCategory(ctx('t1'), 'c1', { name: 'New' } as never)
      ).rejects.toBeInstanceOf(AppError);
    });

    it('allows platform admin to edit built-in category', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ id: 'c1', name: 'Old', tenantId: null })
            .mockResolvedValueOnce(null),
          update: vi.fn().mockResolvedValue({ id: 'c1', name: 'Updated' })
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.updateCategory(ctx(null, { isPlatformAdmin: true }), 'c1', { name: 'Updated' } as never);

      expect(result).toEqual({ id: 'c1', name: 'Updated' });
      expect(audit.record).toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('returns { deleted: true } on success and audits with cascaded count', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1', name: 'Floral', tenantId: 't1' }),
          delete: vi.fn().mockResolvedValue({})
        },
        material: { count: vi.fn().mockResolvedValue(3) }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.deleteCategory(ctx('t1'), 'c1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.materialCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'material_category.delete',
          metadata: { name: 'Floral', cascadedMaterials: 3 }
        })
      );
    });

    it('throws NotFound when category does not exist', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.deleteCategory(ctx('t1'), 'c1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows platform admin to delete built-in category', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1', name: 'BuiltIn', tenantId: null }),
          delete: vi.fn().mockResolvedValue({})
        },
        material: { count: vi.fn().mockResolvedValue(0) }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.deleteCategory(ctx(null, { isPlatformAdmin: true }), 'c1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('listMaterials', () => {
    it('returns paginated items, scoped to a specific category when provided', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1' })
        },
        material: {
          findMany: vi.fn().mockResolvedValue([{ id: 'm1' }]),
          count: vi.fn().mockResolvedValue(1)
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.listMaterials(ctx('t1'), 'c1', 1, 10);

      expect(result).toEqual({
        items: [{ id: 'm1' }],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      });
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'c1' },
        orderBy: { sortOrder: 'asc' },
        skip: 0,
        take: 10
      });
    });

    it('throws NotFound when categoryId is provided but invalid', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.listMaterials(ctx('t1'), 'missing')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('scopes by tenant category ids when no categoryId is given', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findMany: vi.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
        },
        material: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0)
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await service.listMaterials(ctx('t1'));

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: { in: ['c1', 'c2'] } } })
      );
    });
  });

  describe('createMaterial', () => {
    it('throws NotFound when category does not belong to tenant', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.createMaterial(ctx('t1'), { categoryId: 'c1' } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates the material and audits when category is valid', async () => {
      const created = { id: 'm1', name: 'Rose' };
      const prisma = makePrisma({
        materialCategory: { findFirst: vi.fn().mockResolvedValue({ id: 'c1' }) },
        material: { create: vi.fn().mockResolvedValue(created) }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.createMaterial(ctx('t1'), { categoryId: 'c1', name: 'Rose' } as never);

      expect(result).toEqual(created);
      expect(prisma.material.create).toHaveBeenCalledWith({
        data: { categoryId: 'c1', name: 'Rose', tenantId: 't1' }
      });
      expect(audit.record).toHaveBeenCalledWith({
        tenantId: 't1',
        userId: 'u1',
        action: 'material.create',
        entity: 'material',
        entityId: 'm1',
        metadata: { name: 'Rose', categoryId: 'c1' }
      });
    });

    it('allows platform admin to create material in built-in category', async () => {
      const created = { id: 'm1', name: 'BuiltInMat' };
      const prisma = makePrisma({
        materialCategory: { findFirst: vi.fn().mockResolvedValue({ id: 'c1', tenantId: null }) },
        material: { create: vi.fn().mockResolvedValue(created) }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.createMaterial(ctx(null, { isPlatformAdmin: true }), { categoryId: 'c1', name: 'BuiltInMat' } as never);

      expect(result).toEqual(created);
      expect(prisma.material.create).toHaveBeenCalledWith({
        data: { categoryId: 'c1', name: 'BuiltInMat', tenantId: null }
      });
    });
  });

  describe('updateMaterial', () => {
    it('throws NotFound when material is missing', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.updateMaterial(ctx('t1'), 'm1', {} as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when material category tenant mismatches', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 'other', category: { tenantId: 'other' } })
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.updateMaterial(ctx('t1'), 'm1', {} as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates and audits when ownership matches', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', tenantId: 't1', category: { tenantId: 't1' }, name: 'Rose' }),
          update: vi.fn().mockResolvedValue({ id: 'm1', name: 'Updated' })
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.updateMaterial(ctx('t1'), 'm1', { name: 'Updated' } as never);

      expect(result).toEqual({ id: 'm1', name: 'Updated' });
      expect(audit.record).toHaveBeenCalled();
    });

    it('allows platform admin to update built-in material', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', tenantId: null, category: { tenantId: null }, name: 'Old' }),
          update: vi.fn().mockResolvedValue({ id: 'm1', name: 'Updated' })
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.updateMaterial(ctx(null, { isPlatformAdmin: true }), 'm1', { name: 'Updated' } as never);
      expect(result).toEqual({ id: 'm1', name: 'Updated' });
      expect(audit.record).toHaveBeenCalled();
    });
  });

  describe('deleteMaterial', () => {
    it('returns { deleted: true } and audits on success', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: 'm1', tenantId: 't1', name: 'Rose', categoryId: 'c1', category: { tenantId: 't1' } }),
          delete: vi.fn().mockResolvedValue({})
        }
      });
      const audit = makeAudit();
      const service = new MaterialsService(prisma as never, audit as never);

      const result = await service.deleteMaterial(ctx('t1'), 'm1');
      expect(result).toEqual({ deleted: true });
      expect(audit.record).toHaveBeenCalledWith({
        tenantId: 't1',
        userId: 'u1',
        action: 'material.delete',
        entity: 'material',
        entityId: 'm1',
        metadata: { name: 'Rose', categoryId: 'c1' }
      });
    });

    it('throws NotFound when material is missing or wrong tenant', async () => {
      const prisma = makePrisma({
        material: { findFirst: vi.fn().mockResolvedValue(null) }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.deleteMaterial(ctx('t1'), 'm1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allows platform admin to delete built-in material', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', tenantId: null, category: { tenantId: null }, name: 'Old' }),
          delete: vi.fn().mockResolvedValue({})
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.deleteMaterial(ctx(null, { isPlatformAdmin: true }), 'm1');
      expect(result).toEqual({ deleted: true });
    });
  });

  // Task-material bridge methods keep old signatures — no changes below

  describe('addTaskMaterial', () => {
    it('throws NotFound when task is missing', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.addTaskMaterial({ tenantId: 't1', taskId: 'task1', materialId: 'm1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when material is missing or wrong tenant', async () => {
      const prisma = makePrisma({
        task: { findFirst: vi.fn().mockResolvedValue({ id: 'task1' }) },
        material: { findFirst: vi.fn().mockResolvedValue(null) }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.addTaskMaterial({ tenantId: 't1', taskId: 'task1', materialId: 'm1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates the taskMaterial link when both exist', async () => {
      const created = { id: 'tm1' };
      const prisma = makePrisma({
        task: { findFirst: vi.fn().mockResolvedValue({ id: 'task1' }) },
        material: { findFirst: vi.fn().mockResolvedValue({ id: 'm1', category: { tenantId: 't1' } }) },
        taskMaterial: { create: vi.fn().mockResolvedValue(created) }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.addTaskMaterial({
        tenantId: 't1',
        taskId: 'task1',
        materialId: 'm1'
      });
      expect(result).toEqual(created);
    });
  });

  describe('removeTaskMaterial', () => {
    it('returns { deleted: true } on success', async () => {
      const prisma = makePrisma({
        taskMaterial: {
          findFirst: vi.fn().mockResolvedValue({ id: 'tm1', task: { tenantId: 't1' } }),
          delete: vi.fn().mockResolvedValue({})
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.removeTaskMaterial({ tenantId: 't1', id: 'tm1' });
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFound when taskMaterial does not exist', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.removeTaskMaterial({ tenantId: 't1', id: 'tm1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('confirmTaskMaterial', () => {
    it('updates the confirmed flag', async () => {
      const updated = { id: 'tm1', confirmed: true };
      const prisma = makePrisma({
        taskMaterial: {
          findFirst: vi.fn().mockResolvedValue({ id: 'tm1', task: { tenantId: 't1' } }),
          update: vi.fn().mockResolvedValue(updated)
        }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.confirmTaskMaterial({
        tenantId: 't1',
        id: 'tm1',
        confirmed: true
      });
      expect(result).toEqual(updated);
      expect(prisma.taskMaterial.update).toHaveBeenCalledWith({
        where: { id: 'tm1' },
        data: { confirmed: true }
      });
    });
  });

  describe('getTaskMaterials', () => {
    it('throws NotFound when task is missing', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      await expect(
        service.getTaskMaterials({ tenantId: 't1', taskId: 'task1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns task materials with material included', async () => {
      const items = [{ id: 'tm1', material: { id: 'm1' } }];
      const prisma = makePrisma({
        task: { findFirst: vi.fn().mockResolvedValue({ id: 'task1' }) },
        taskMaterial: { findMany: vi.fn().mockResolvedValue(items) }
      });
      const service = new MaterialsService(prisma as never, makeAudit() as never);

      const result = await service.getTaskMaterials({ tenantId: 't1', taskId: 'task1' });
      expect(result).toEqual(items);
      expect(prisma.taskMaterial.findMany).toHaveBeenCalledWith({
        where: { taskId: 'task1' },
        include: { material: true }
      });
    });
  });
});
