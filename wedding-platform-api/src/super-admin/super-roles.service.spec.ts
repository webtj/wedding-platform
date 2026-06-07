import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SuperRolesService } from './super-roles.service';
import { BusinessException } from '../common/exceptions/business.exception';

const buildAuth = (tenantId: string) =>
  ({ tenantId, userId: 'u1', memberId: 'm1', isSuperAdmin: true }) as never;

describe('SuperRolesService', () => {
  describe('list', () => {
    it('paginates tenant roles with optional search filter', async () => {
      const prisma = {
        role: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperRolesService(prisma as never);
      const result = await service.list({ auth: buildAuth('t1'), search: 'planner' });
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', name: { contains: 'planner' } },
          orderBy: { createdAt: 'desc' }
        })
      );
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    });
  });

  describe('getById', () => {
    it('returns role with permissions, menus, and tenant name', async () => {
      const role = { id: 'r1', tenantId: 't1' };
      const prisma = { role: { findFirst: vi.fn().mockResolvedValue(role) } };
      const service = new SuperRolesService(prisma as never);
      const result = await service.getById(buildAuth('t1'), 'r1');
      expect(result).toEqual(role);
      expect(prisma.role.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1', tenantId: 't1' },
          include: expect.objectContaining({
            menus: { include: { menuItem: true } },
            tenant: { select: { name: true } }
          })
        })
      );
    });

    it('throws NotFound when role does not exist', async () => {
      const prisma = { role: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new SuperRolesService(prisma as never);
      await expect(service.getById(buildAuth('t1'), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws BusinessException when role code already exists', async () => {
      const prisma = {
        role: {
          findFirst: vi.fn().mockResolvedValue({ id: 'r1' }),
          create: vi.fn()
        }
      };
      const service = new SuperRolesService(prisma as never);
      await expect(
        service.create(buildAuth('t1'), { code: 'planner', name: '策划' } as never)
      ).rejects.toBeInstanceOf(BusinessException);
    });

    it('creates a tenant-scoped role when code is new', async () => {
      const prisma = {
        role: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'r2' })
        }
      };
      const service = new SuperRolesService(prisma as never);
      await service.create(buildAuth('t1'), { code: 'helper', name: '助手' } as never);
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: { code: 'helper', name: '助手', scope: 'tenant', tenantId: 't1', isBuiltIn: true }
      });
    });
  });

  describe('update', () => {
    it('updates the role when it belongs to the tenant', async () => {
      const prisma = {
        role: {
          findFirst: vi.fn().mockResolvedValue({ id: 'r1' }),
          update: vi.fn().mockResolvedValue({ id: 'r1', name: '新名' })
        }
      };
      const service = new SuperRolesService(prisma as never);
      await service.update(buildAuth('t1'), 'r1', { name: '新名' } as never);
      expect(prisma.role.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { name: '新名' } });
    });

    it('throws NotFound when role does not exist', async () => {
      const prisma = { role: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new SuperRolesService(prisma as never);
      await expect(
        service.update(buildAuth('t1'), 'missing', { name: 'x' } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('throws NotFound when role does not exist', async () => {
      const prisma = { role: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new SuperRolesService(prisma as never);
      await expect(service.delete(buildAuth('t1'), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BusinessException for built-in roles', async () => {
      const prisma = {
        role: { findFirst: vi.fn().mockResolvedValue({ id: 'r1', isBuiltIn: true }), delete: vi.fn() }
      };
      const service = new SuperRolesService(prisma as never);
      await expect(service.delete(buildAuth('t1'), 'r1')).rejects.toBeInstanceOf(BusinessException);
    });

    it('deletes non-built-in roles', async () => {
      const prisma = {
        role: {
          findFirst: vi.fn().mockResolvedValue({ id: 'r1', isBuiltIn: false }),
          delete: vi.fn().mockResolvedValue({ id: 'r1' })
        }
      };
      const service = new SuperRolesService(prisma as never);
      await service.delete(buildAuth('t1'), 'r1');
      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });

  describe('assignMenus', () => {
    it('replaces the role-menu associations in two writes', async () => {
      const prisma = {
        role: {
          findFirst: vi.fn().mockResolvedValue({ id: 'r1' }),
          update: vi.fn().mockResolvedValue({ id: 'r1' })
        },
        roleMenuItem: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 3 })
        },
        menuItem: {
          findMany: vi.fn().mockResolvedValue([
            { permissionCodes: ['project.read'] },
            { permissionCodes: ['project.read', 'task.create'] },
            { permissionCodes: [] }
          ])
        }
      };
      const service = new SuperRolesService(prisma as never);
      const result = await service.assignMenus(buildAuth('t1'), 'r1', { menuIds: ['m1', 'm2', 'm3'] } as never);
      expect(prisma.roleMenuItem.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'r1' } });
      expect(prisma.roleMenuItem.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'r1', menuItemId: 'm1' }, { roleId: 'r1', menuItemId: 'm2' }, { roleId: 'r1', menuItemId: 'm3' }]
      });
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { permissionCodes: ['project.read', 'task.create'] }
      });
      expect(result).toEqual({ success: true });
    });

    it('skips createMany when menuIds is empty', async () => {
      const prisma = {
        role: {
          findFirst: vi.fn().mockResolvedValue({ id: 'r1' }),
          update: vi.fn().mockResolvedValue({ id: 'r1' })
        },
        roleMenuItem: { deleteMany: vi.fn(), createMany: vi.fn() },
        menuItem: { findMany: vi.fn().mockResolvedValue([]) }
      };
      const service = new SuperRolesService(prisma as never);
      await service.assignMenus(buildAuth('t1'), 'r1', { menuIds: [] } as never);
      expect(prisma.roleMenuItem.createMany).not.toHaveBeenCalled();
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { permissionCodes: [] }
      });
    });

    it('throws NotFound when role is missing', async () => {
      const prisma = { role: { findFirst: vi.fn().mockResolvedValue(null) }, roleMenuItem: { deleteMany: vi.fn() } };
      const service = new SuperRolesService(prisma as never);
      await expect(
        service.assignMenus(buildAuth('t1'), 'missing', { menuIds: ['m1'] } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getAvailableMenusForRole', () => {
    it('returns top-level tenant menu tree (parents with sorted children)', async () => {
      const prisma = { menuItem: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperRolesService(prisma as never);
      await service.getAvailableMenusForRole(buildAuth('t1'));
      expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: null, tenantId: 't1' },
          include: expect.objectContaining({ children: { orderBy: { sortOrder: 'asc' } } }),
          orderBy: { sortOrder: 'asc' }
        })
      );
    });

    it('does not require a roleId (independent of role state)', async () => {
      const prisma = { menuItem: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperRolesService(prisma as never);
      // No prisma.role mock — if it queried role, this would throw
      await expect(service.getAvailableMenusForRole(buildAuth('t1'))).resolves.toBeDefined();
    });
  });

  describe('getAssignedMenuIdsForRole', () => {
    it('returns scoped IDs for a valid role', async () => {
      const prisma = {
        role: { findFirst: vi.fn().mockResolvedValue({ id: 'r1' }) },
        roleMenuItem: { findMany: vi.fn().mockResolvedValue([{ menuItemId: 'm1' }, { menuItemId: 'm2' }]) }
      };
      const service = new SuperRolesService(prisma as never);
      const result = await service.getAssignedMenuIdsForRole(buildAuth('t1'), 'r1');
      expect(result).toEqual(['m1', 'm2']);
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { id: 'r1', tenantId: 't1' },
        select: { id: true }
      });
    });

    it('returns [] when role has no assigned menus', async () => {
      const prisma = {
        role: { findFirst: vi.fn().mockResolvedValue({ id: 'r1' }) },
        roleMenuItem: { findMany: vi.fn().mockResolvedValue([]) }
      };
      const service = new SuperRolesService(prisma as never);
      const result = await service.getAssignedMenuIdsForRole(buildAuth('t1'), 'r1');
      expect(result).toEqual([]);
    });

    it('throws NotFound when role is missing or cross-tenant', async () => {
      const prisma = {
        role: { findFirst: vi.fn().mockResolvedValue(null) },
        roleMenuItem: { findMany: vi.fn() }
      };
      const service = new SuperRolesService(prisma as never);
      await expect(service.getAssignedMenuIdsForRole(buildAuth('t1'), 'missing')).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });
});
