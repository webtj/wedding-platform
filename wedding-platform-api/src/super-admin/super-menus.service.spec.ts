import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuperMenusService } from './super-menus.service';

describe('SuperMenusService', () => {
  describe('list', () => {
    it('returns top-level menu items with children ordered by sortOrder', async () => {
      const prisma = { menuItem: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperMenusService(prisma as never);
      await service.list();
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { parentId: null },
        include: { children: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' }
      });
    });
  });

  describe('listAll', () => {
    it('returns all menus ordered by parentId then sortOrder', async () => {
      const prisma = { menuItem: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperMenusService(prisma as never);
      await service.listAll();
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith({
        orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }]
      });
    });
  });

  describe('create', () => {
    it('throws NotFound when parentId does not exist', async () => {
      const prisma = { menuItem: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() } };
      const service = new SuperMenusService(prisma as never);
      await expect(
        service.create({ parentId: 'missing', label: '子菜单', sortOrder: 1 } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a top-level menu with default scope=tenant and visible=true', async () => {
      const prisma = {
        menuItem: {
          findUnique: vi.fn(),
          create: vi.fn().mockResolvedValue({ id: 'm1' })
        }
      };
      const service = new SuperMenusService(prisma as never);
      await service.create({ label: '客户管理', sortOrder: 1 } as never);
      expect(prisma.menuItem.create).toHaveBeenCalledWith({
        data: {
          scope: 'tenant',
          tenantId: null,
          parentId: null,
          label: '客户管理',
          href: null,
          icon: null,
          sortOrder: 1,
          visible: true
        }
      });
    });

    it('inherits scope and tenantId from parent when parentId is set', async () => {
      const parent = { id: 'p1', scope: 'platform', tenantId: 't1' };
      const prisma = {
        menuItem: {
          findUnique: vi.fn().mockResolvedValue(parent),
          create: vi.fn().mockResolvedValue({ id: 'm2' })
        }
      };
      const service = new SuperMenusService(prisma as never);
      await service.create({ parentId: 'p1', label: '子菜单', sortOrder: 2 } as never);
      expect(prisma.menuItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scope: 'platform',
            tenantId: 't1',
            parentId: 'p1'
          })
        })
      );
    });
  });

  describe('update', () => {
    it('throws NotFound when menu item does not exist', async () => {
      const prisma = { menuItem: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() } };
      const service = new SuperMenusService(prisma as never);
      await expect(
        service.update({ menuItemId: 'missing', data: {} })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when reassigning to a non-existent parent', async () => {
      const item = { id: 'm1' };
      const prisma = {
        menuItem: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(item)
            .mockResolvedValueOnce(null),
          update: vi.fn()
        }
      };
      const service = new SuperMenusService(prisma as never);
      await expect(
        service.update({ menuItemId: 'm1', data: { parentId: 'missing' } as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates the menu item when all validations pass', async () => {
      const item = { id: 'm1' };
      const prisma = {
        menuItem: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce(item)
            .mockResolvedValueOnce({ id: 'p1' }),
          update: vi.fn().mockResolvedValue({ id: 'm1', label: '新' })
        }
      };
      const service = new SuperMenusService(prisma as never);
      await service.update({ menuItemId: 'm1', data: { label: '新', parentId: 'p1' } as never });
      expect(prisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { label: '新', parentId: 'p1' }
      });
    });
  });

  describe('delete', () => {
    it('throws Conflict when menu has children', async () => {
      const prisma = {
        menuItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'm1', children: [{ id: 'c1' }] }),
          delete: vi.fn()
        }
      };
      const service = new SuperMenusService(prisma as never);
      await expect(service.delete('m1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes the menu when no children', async () => {
      const prisma = {
        menuItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'm1', children: [] }),
          delete: vi.fn().mockResolvedValue({ id: 'm1' })
        }
      };
      const service = new SuperMenusService(prisma as never);
      const result = await service.delete('m1');
      expect(result).toEqual({ id: 'm1' });
    });

    it('throws NotFound when menu does not exist', async () => {
      const prisma = { menuItem: { findUnique: vi.fn().mockResolvedValue(null), delete: vi.fn() } };
      const service = new SuperMenusService(prisma as never);
      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('runs updates in a transaction and returns listAll', async () => {
      const updateMock = vi.fn();
      const prisma = {
        menuItem: { update: updateMock, findMany: vi.fn().mockResolvedValue([]) },
        $transaction: vi.fn((arr: Promise<unknown>[]) => Promise.all(arr))
      };
      const service = new SuperMenusService(prisma as never);
      const result = await service.reorder({ items: [{ id: 'm1', sortOrder: 0 }, { id: 'm2', sortOrder: 1 }] });
      expect(updateMock).toHaveBeenCalledTimes(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });
});
