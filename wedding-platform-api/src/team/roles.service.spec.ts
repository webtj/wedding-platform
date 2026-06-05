import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RolesService } from './roles.service';

const mockTokenService = {
  revokeSessionsByRoleId: vi.fn().mockResolvedValue(0)
};

function createMockPrisma() {
  const txMock = {
    role: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn()
    },
    rolePermission: {
      createMany: vi.fn(),
      deleteMany: vi.fn()
    },
    roleMenuItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn()
    }
  };

  return {
    prisma: {
      role: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn(),
        delete: vi.fn()
      },
      rolePermission: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      roleMenuItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      menuItem: {
        findFirst: vi.fn()
      },
      user: {
        findUnique: vi.fn()
      },
      $transaction: vi.fn((fn: (tx: Record<string, unknown>) => Promise<unknown>) => fn(txMock))
    },
    txMock
  };
}

describe('RolesService', () => {
  it('lists tenant roles', async () => {
    const { prisma } = createMockPrisma();
    const service = new RolesService(prisma as never, mockTokenService as never);

    await service.list({ tenantId: 'tenant_1', page: 1, pageSize: 10 });

    expect(prisma.role.findMany).toHaveBeenCalled();
  });

  describe('create', () => {
    it('creates a tenant-scoped role', async () => {
      const { prisma, txMock } = createMockPrisma();
      const createdRole = { id: 'role_1', tenantId: 't1', scope: 'tenant', code: 'editor', name: 'Editor' };
      txMock.role.create.mockResolvedValue(createdRole);
      txMock.role.findUniqueOrThrow.mockResolvedValue({ ...createdRole, permissions: [], menus: [] });

      const service = new RolesService(prisma as never, mockTokenService as never);
      const result = await service.create({
        tenantId: 't1',
        code: 'editor',
        name: 'Editor',
        userId: 'user_1'
      });

      expect(txMock.role.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', scope: 'tenant', code: 'editor', name: 'Editor', description: undefined }
      });
      expect(result).toEqual({ ...createdRole, permissions: [], menus: [] });
    });

    it('creates a role with permissions and menu items', async () => {
      const { prisma, txMock } = createMockPrisma();
      const createdRole = { id: 'role_1', tenantId: 't1', scope: 'tenant', code: 'editor', name: 'Editor' };
      txMock.role.create.mockResolvedValue(createdRole);
      txMock.role.findUniqueOrThrow.mockResolvedValue({ ...createdRole, permissions: [], menus: [] });

      prisma.menuItem.findFirst.mockResolvedValue({ id: 'menu_1', scope: 'tenant', tenantId: 't1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        tenantMembers: [{ roles: [{ role: { menus: [{ roleId: 'r1', menuItemId: 'menu_1' }] } }] }]
      });

      const service = new RolesService(prisma as never, mockTokenService as never);
      await service.create({
        tenantId: 't1',
        code: 'editor',
        name: 'Editor',
        permissionIds: ['perm_1', 'perm_2'],
        menuItemIds: ['menu_1'],
        userId: 'user_1'
      });

      expect(txMock.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role_1', permissionId: 'perm_1' },
          { roleId: 'role_1', permissionId: 'perm_2' }
        ]
      });
      expect(txMock.roleMenuItem.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'role_1', menuItemId: 'menu_1' }]
      });
    });
  });

  describe('getById', () => {
    it('returns a role by ID for the owning tenant', async () => {
      const { prisma } = createMockPrisma();
      const role = { id: 'role_1', tenantId: 't1', scope: 'tenant', code: 'editor', name: 'Editor', permissions: [], menus: [] };
      prisma.role.findFirst.mockResolvedValue(role);

      const service = new RolesService(prisma as never, mockTokenService as never);
      const result = await service.getById({ id: 'role_1', tenantId: 't1' });

      expect(result).toEqual(role);
    });

    it('throws not found for a role belonging to another tenant', async () => {
      const { prisma } = createMockPrisma();
      prisma.role.findFirst.mockResolvedValue(null);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(service.getById({ id: 'role_1', tenantId: 't1' })).rejects.toThrow('角色 不存在');
    });

    it('throws not found when role does not exist', async () => {
      const { prisma } = createMockPrisma();
      prisma.role.findFirst.mockResolvedValue(null);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(service.getById({ id: 'missing', tenantId: 't1' })).rejects.toThrow('角色 不存在');
    });
  });

  describe('update', () => {
    it('updates role name and description', async () => {
      const { prisma, txMock } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: false, members: [] };
      prisma.role.findFirst.mockResolvedValue(existing);
      txMock.role.findUniqueOrThrow.mockResolvedValue({ ...existing, name: 'Updated', permissions: [], menus: [] });

      const service = new RolesService(prisma as never, mockTokenService as never);
      await service.update({
        id: 'role_1',
        tenantId: 't1',
        name: 'Updated',
        description: 'New desc',
        userId: 'user_1'
      });

      expect(txMock.role.update).toHaveBeenCalledWith({
        where: { id: 'role_1' },
        data: { name: 'Updated', description: 'New desc' }
      });
    });

    it('replaces permissions when permissionIds provided', async () => {
      const { prisma, txMock } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: false, members: [] };
      prisma.role.findFirst.mockResolvedValue(existing);
      txMock.role.findUniqueOrThrow.mockResolvedValue({ ...existing, permissions: [], menus: [] });

      const service = new RolesService(prisma as never, mockTokenService as never);
      await service.update({
        id: 'role_1',
        tenantId: 't1',
        permissionIds: ['perm_3'],
        userId: 'user_1'
      });

      expect(txMock.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role_1' } });
      expect(txMock.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleId: 'role_1', permissionId: 'perm_3' }]
      });
    });

    it('replaces menu items when menuItemIds provided', async () => {
      const { prisma, txMock } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: false, members: [] };
      prisma.role.findFirst.mockResolvedValue(existing);
      prisma.menuItem.findFirst
        .mockResolvedValueOnce({ id: 'menu_1', scope: 'tenant', tenantId: 't1' })
        .mockResolvedValueOnce({ id: 'menu_2', scope: 'tenant', tenantId: 't1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        tenantMembers: [{
          roles: [{
            role: {
              menus: [
                { roleId: 'r1', menuItemId: 'menu_1' },
                { roleId: 'r1', menuItemId: 'menu_2' }
              ]
            }
          }]
        }]
      });
      txMock.role.findUniqueOrThrow.mockResolvedValue({ ...existing, permissions: [], menus: [] });

      const service = new RolesService(prisma as never, mockTokenService as never);
      await service.update({
        id: 'role_1',
        tenantId: 't1',
        menuItemIds: ['menu_1', 'menu_2'],
        userId: 'user_1'
      });

      expect(txMock.roleMenuItem.deleteMany).toHaveBeenCalledWith({ where: { roleId: 'role_1' } });
      expect(txMock.roleMenuItem.createMany).toHaveBeenCalledWith({
        data: [
          { roleId: 'role_1', menuItemId: 'menu_1' },
          { roleId: 'role_1', menuItemId: 'menu_2' }
        ]
      });
    });

    it('rejects editing built-in roles', async () => {
      const { prisma } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: true, members: [] };
      prisma.role.findFirst.mockResolvedValue(existing);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(
        service.update({ id: 'role_1', tenantId: 't1', name: 'Bad', userId: 'user_1' })
      ).rejects.toThrow('内置角色不可编辑');
    });

    it('rejects updating a role belonging to another tenant', async () => {
      const { prisma } = createMockPrisma();
      prisma.role.findFirst.mockResolvedValue(null);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(
        service.update({ id: 'role_1', tenantId: 't1', name: 'Bad', userId: 'user_1' })
      ).rejects.toThrow('角色 不存在');
    });
  });

  describe('delete', () => {
    it('deletes a role that has no members', async () => {
      const { prisma } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: false, members: [] };
      prisma.role.findFirst.mockResolvedValue(existing);

      const service = new RolesService(prisma as never, mockTokenService as never);
      const result = await service.delete({ id: 'role_1', tenantId: 't1' });

      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role_1' } });
      expect(result).toEqual({ deleted: true });
    });

    it('rejects deleting a role that has members assigned', async () => {
      const { prisma } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: false, members: [{ memberId: 'm1', roleId: 'role_1' }] };
      prisma.role.findFirst.mockResolvedValue(existing);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(service.delete({ id: 'role_1', tenantId: 't1' })).rejects.toThrow('该角色下仍有成员，无法删除');
    });

    it('rejects deleting built-in roles', async () => {
      const { prisma } = createMockPrisma();
      const existing = { id: 'role_1', tenantId: 't1', scope: 'tenant', isBuiltIn: true, members: [] };
      prisma.role.findFirst.mockResolvedValue(existing);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(service.delete({ id: 'role_1', tenantId: 't1' })).rejects.toThrow('内置角色不可删除');
    });

    it('rejects deleting a role belonging to another tenant', async () => {
      const { prisma } = createMockPrisma();
      prisma.role.findFirst.mockResolvedValue(null);

      const service = new RolesService(prisma as never, mockTokenService as never);
      await expect(service.delete({ id: 'role_1', tenantId: 't1' })).rejects.toThrow('角色 不存在');
    });
  });

  describe('canAssignMenu', () => {
    it('returns true when menu belongs to same tenant and user has access', async () => {
      const { prisma } = createMockPrisma();
      prisma.menuItem.findFirst.mockResolvedValue({ id: 'menu_1', scope: 'tenant', tenantId: 't1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        tenantMembers: [
          {
            roles: [
              {
                role: {
                  menus: [{ roleId: 'r1', menuItemId: 'menu_1' }]
                }
              }
            ]
          }
        ]
      });

      const service = new RolesService(prisma as never, mockTokenService as never);
      const result = await service.canAssignMenu('user_1', 't1', 'menu_1');

      expect(result).toBe(true);
    });

    it('returns false for menu item belonging to another tenant', async () => {
      const { prisma } = createMockPrisma();
      prisma.menuItem.findFirst.mockResolvedValue(null);

      const service = new RolesService(prisma as never, mockTokenService as never);
      const result = await service.canAssignMenu('user_1', 't1', 'menu_1');

      expect(result).toBe(false);
    });

    it('returns false when user has no role with access to the menu', async () => {
      const { prisma } = createMockPrisma();
      prisma.menuItem.findFirst.mockResolvedValue({ id: 'menu_1', scope: 'tenant', tenantId: 't1' });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        tenantMembers: [
          {
            roles: [
              {
                role: {
                  menus: [{ roleId: 'r1', menuItemId: 'menu_2' }]
                }
              }
            ]
          }
        ]
      });

      const service = new RolesService(prisma as never, mockTokenService as never);
      const result = await service.canAssignMenu('user_1', 't1', 'menu_1');

      expect(result).toBe(false);
    });
  });
});
