import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MaterialsService } from './materials.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    materialCategory: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
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

describe('MaterialsService', () => {
  describe('listCategories', () => {
    it('returns categories ordered by sortOrder with material count', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findMany: vi.fn().mockResolvedValue([{ id: 'c1', _count: { materials: 3 } }])
        }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.listCategories({ tenantId: 't1' });

      expect(result).toEqual([{ id: 'c1', _count: { materials: 3 } }]);
      expect(prisma.materialCategory.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { materials: true } } }
      });
    });
  });

  describe('createCategory', () => {
    it('passes tenantId and data into create', async () => {
      const created = { id: 'c1', name: 'Floral' };
      const prisma = makePrisma({
        materialCategory: { create: vi.fn().mockResolvedValue(created) }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.createCategory({
        tenantId: 't1',
        data: { name: 'Floral', sortOrder: 1 } as never
      });

      expect(result).toEqual(created);
      expect(prisma.materialCategory.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', name: 'Floral', sortOrder: 1 }
      });
    });
  });

  describe('updateCategory', () => {
    it('updates the category when it belongs to the tenant', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1' }),
          update: vi.fn().mockResolvedValue({ id: 'c1', name: 'Updated' })
        }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.updateCategory({
        tenantId: 't1',
        categoryId: 'c1',
        data: { name: 'Updated' } as never
      });

      expect(result).toEqual({ id: 'c1', name: 'Updated' });
    });

    it('throws NotFound when category does not exist', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

      await expect(
        service.updateCategory({ tenantId: 't1', categoryId: 'c1', data: {} as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteCategory', () => {
    it('returns { deleted: true } on success', async () => {
      const prisma = makePrisma({
        materialCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.deleteCategory({ tenantId: 't1', categoryId: 'c1' });

      expect(result).toEqual({ deleted: true });
      expect(prisma.materialCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });

    it('throws NotFound when category does not exist', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

      await expect(
        service.deleteCategory({ tenantId: 't1', categoryId: 'c1' })
      ).rejects.toBeInstanceOf(NotFoundException);
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
      const service = new MaterialsService(prisma as never);

      const result = await service.listMaterials({
        tenantId: 't1',
        categoryId: 'c1',
        page: 1,
        pageSize: 10
      });

      expect(result).toEqual({ items: [{ id: 'm1' }], total: 1, page: 1, pageSize: 10, totalPages: 1 });
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'c1' },
        orderBy: { sortOrder: 'asc' },
        skip: 0,
        take: 10
      });
    });

    it('throws NotFound when categoryId is provided but invalid', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

      await expect(
        service.listMaterials({ tenantId: 't1', categoryId: 'missing' })
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
      const service = new MaterialsService(prisma as never);

      await service.listMaterials({ tenantId: 't1' });

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { categoryId: { in: ['c1', 'c2'] } } })
      );
    });
  });

  describe('createMaterial', () => {
    it('throws NotFound when category does not belong to tenant', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

      await expect(
        service.createMaterial({ tenantId: 't1', data: { categoryId: 'c1' } as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates the material when category is valid', async () => {
      const created = { id: 'm1' };
      const prisma = makePrisma({
        materialCategory: { findFirst: vi.fn().mockResolvedValue({ id: 'c1' }) },
        material: { create: vi.fn().mockResolvedValue(created) }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.createMaterial({
        tenantId: 't1',
        data: { categoryId: 'c1', name: 'Rose' } as never
      });

      expect(result).toEqual(created);
      expect(prisma.material.create).toHaveBeenCalledWith({
        data: { categoryId: 'c1', name: 'Rose', tenantId: 't1' }
      });
    });
  });

  describe('updateMaterial', () => {
    it('throws NotFound when material is missing', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

      await expect(
        service.updateMaterial({ tenantId: 't1', materialId: 'm1', data: {} as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when material category tenant mismatches', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', category: { tenantId: 'other' } })
        }
      });
      const service = new MaterialsService(prisma as never);

      await expect(
        service.updateMaterial({ tenantId: 't1', materialId: 'm1', data: {} as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates when ownership matches', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', category: { tenantId: 't1' } }),
          update: vi.fn().mockResolvedValue({ id: 'm1', name: 'Updated' })
        }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.updateMaterial({
        tenantId: 't1',
        materialId: 'm1',
        data: { name: 'Updated' } as never
      });

      expect(result).toEqual({ id: 'm1', name: 'Updated' });
    });
  });

  describe('deleteMaterial', () => {
    it('returns { deleted: true } on success', async () => {
      const prisma = makePrisma({
        material: {
          findFirst: vi.fn().mockResolvedValue({ id: 'm1', category: { tenantId: 't1' } }),
          delete: vi.fn().mockResolvedValue({})
        }
      });
      const service = new MaterialsService(prisma as never);

      const result = await service.deleteMaterial({ tenantId: 't1', materialId: 'm1' });
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFound when material is missing or wrong tenant', async () => {
      const prisma = makePrisma({
        material: { findFirst: vi.fn().mockResolvedValue(null) }
      });
      const service = new MaterialsService(prisma as never);

      await expect(
        service.deleteMaterial({ tenantId: 't1', materialId: 'm1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addTaskMaterial', () => {
    it('throws NotFound when task is missing', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

      await expect(
        service.addTaskMaterial({ tenantId: 't1', taskId: 'task1', materialId: 'm1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when material is missing or wrong tenant', async () => {
      const prisma = makePrisma({
        task: { findFirst: vi.fn().mockResolvedValue({ id: 'task1' }) },
        material: { findFirst: vi.fn().mockResolvedValue(null) }
      });
      const service = new MaterialsService(prisma as never);

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
      const service = new MaterialsService(prisma as never);

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
      const service = new MaterialsService(prisma as never);

      const result = await service.removeTaskMaterial({ tenantId: 't1', id: 'tm1' });
      expect(result).toEqual({ deleted: true });
    });

    it('throws NotFound when taskMaterial does not exist', async () => {
      const prisma = makePrisma();
      const service = new MaterialsService(prisma as never);

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
      const service = new MaterialsService(prisma as never);

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
      const service = new MaterialsService(prisma as never);

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
      const service = new MaterialsService(prisma as never);

      const result = await service.getTaskMaterials({ tenantId: 't1', taskId: 'task1' });
      expect(result).toEqual(items);
      expect(prisma.taskMaterial.findMany).toHaveBeenCalledWith({
        where: { taskId: 'task1' },
        include: { material: true }
      });
    });
  });
});
