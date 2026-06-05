import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuperUsersService } from './super-users.service';

const buildAuth = (overrides: Partial<{ tenantId: string; isPlatformAdmin: boolean; userId: string }> = {}) =>
  ({
    tenantId: overrides.tenantId ?? 't1',
    userId: overrides.userId ?? 'admin_1',
    memberId: 'm1',
    isPlatformAdmin: overrides.isPlatformAdmin ?? false,
    isSuperAdmin: overrides.isPlatformAdmin ?? false
  }) as never;

const buildPasswordService = () => ({ hash: vi.fn().mockResolvedValue('hashed-pw') });

describe('SuperUsersService', () => {
  describe('list', () => {
    it('paginates tenant users with optional search and role filter', async () => {
      const prisma = {
        user: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);

      await service.list({ auth: buildAuth(), search: '王', roleCode: 'planner' });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { displayName: { contains: '王' } },
              { authAccounts: { some: { identifier: { contains: '王' } } } }
            ],
            tenantMembers: {
              some: expect.objectContaining({
                tenantId: 't1',
                roles: { some: { role: { code: 'planner' } } }
              })
            }
          }),
          orderBy: { createdAt: 'desc' }
        })
      );
    });
  });

  describe('getById', () => {
    it('returns the user with authAccounts + tenantMembers + roles', async () => {
      const user = { id: 'u1' };
      const prisma = { user: { findUnique: vi.fn().mockResolvedValue(user) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      const result = await service.getById(buildAuth(), 'u1');
      expect(result).toEqual(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          include: expect.objectContaining({
            authAccounts: expect.any(Object),
            tenantMembers: expect.any(Object)
          })
        })
      );
    });

    it('throws NotFound when user does not exist', async () => {
      const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await expect(service.getById(buildAuth(), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listTenantsForFilter', () => {
    it('returns all tenants for platform admins', async () => {
      const prisma = { tenant: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await service.listTenantsForFilter(buildAuth({ isPlatformAdmin: true }));
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: {},
        select: { id: true, name: true }
      });
    });

    it('scopes by tenantId for non-platform admins', async () => {
      const prisma = { tenant: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await service.listTenantsForFilter(buildAuth({ tenantId: 't1', isPlatformAdmin: false }));
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        where: { id: 't1' },
        select: { id: true, name: true }
      });
    });
  });

  describe('listRolesForFilter', () => {
    it('returns distinct role codes ordered by code', async () => {
      const prisma = { role: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await service.listRolesForFilter(buildAuth({ isPlatformAdmin: true }));
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {},
        select: { id: true, code: true, name: true },
        distinct: ['code'],
        orderBy: { code: 'asc' }
      });
    });
  });

  describe('create', () => {
    it('throws Conflict when authAccount identifier already exists', async () => {
      const prisma = { authAccount: { findUnique: vi.fn().mockResolvedValue({ id: 'aa1' }) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await expect(
        service.create(buildAuth(), {
          identifier: 'wang',
          password: 'pw',
          displayName: '王',
          tenantId: 't1',
          roleIds: []
        } as never)
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates user, member, and role assignments in a transaction', async () => {
      const createdUser = { id: 'u_new' };
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue(createdUser),
          findUnique: vi.fn().mockResolvedValue({ id: 'u_new' })
        },
        tenant: { findUnique: vi.fn().mockResolvedValue({ id: 't1' }) },
        tenantMember: { create: vi.fn().mockResolvedValue({ id: 'm_new' }) },
        memberRole: { createMany: vi.fn().mockResolvedValue({ count: 2 }) }
      };
      const prisma = {
        authAccount: { findUnique: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn((cb: (tx: typeof tx) => unknown) => cb(tx))
      };
      const password = buildPasswordService();
      const service = new SuperUsersService(prisma as never, password as never);

      await service.create(buildAuth(), {
        identifier: 'wang',
        password: 'pw',
        displayName: '王',
        tenantId: 't1',
        roleIds: ['r1', 'r2']
      } as never);

      expect(password.hash).toHaveBeenCalledWith('pw');
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: '王',
            authAccounts: {
              create: { provider: 'password', identifier: 'wang', passwordHash: 'hashed-pw' }
            }
          })
        })
      );
      expect(tx.tenantMember.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', userId: 'u_new', displayName: '王' }
      });
      expect(tx.memberRole.createMany).toHaveBeenCalledWith({
        data: [{ memberId: 'm_new', roleId: 'r1' }, { memberId: 'm_new', roleId: 'r2' }]
      });
    });

    it('skips createMany when roleIds is empty', async () => {
      const createdUser = { id: 'u_new' };
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue(createdUser),
          findUnique: vi.fn().mockResolvedValue({ id: 'u_new' })
        },
        tenant: { findUnique: vi.fn().mockResolvedValue({ id: 't1' }) },
        tenantMember: { create: vi.fn().mockResolvedValue({ id: 'm_new' }) },
        memberRole: { createMany: vi.fn() }
      };
      const prisma = {
        authAccount: { findUnique: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn((cb: (tx: typeof tx) => unknown) => cb(tx))
      };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);

      await service.create(buildAuth(), {
        identifier: 'wang',
        password: 'pw',
        displayName: '王',
        tenantId: 't1',
        roleIds: []
      } as never);
      expect(tx.memberRole.createMany).not.toHaveBeenCalled();
    });

    it('throws NotFound when tenant is missing', async () => {
      const createdUser = { id: 'u_new' };
      const tx = {
        user: { create: vi.fn().mockResolvedValue(createdUser) },
        tenant: { findUnique: vi.fn().mockResolvedValue(null) },
        tenantMember: { create: vi.fn() },
        memberRole: { createMany: vi.fn() }
      };
      const prisma = {
        authAccount: { findUnique: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn((cb: (tx: typeof tx) => unknown) => cb(tx))
      };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);

      await expect(
        service.create(buildAuth(), {
          identifier: 'wang',
          password: 'pw',
          displayName: '王',
          tenantId: 'missing',
          roleIds: []
        } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates user info and re-assigns roles when both are provided', async () => {
      const auth = buildAuth({ tenantId: 't1' });
      const prisma = {
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({ id: 'u1' })
            .mockResolvedValueOnce({ id: 'u1', authAccounts: [], tenantMembers: [] })
        },
        authAccount: { findFirst: vi.fn().mockResolvedValue({ id: 'aa1' }), update: vi.fn() },
        user$update: vi.fn(),
        tenantMember: { findFirst: vi.fn().mockResolvedValue({ id: 'm1' }) },
        memberRole: { deleteMany: vi.fn(), createMany: vi.fn() }
      };
      prisma.user.update = prisma.user$update;
      const password = buildPasswordService();
      const service = new SuperUsersService(prisma as never, password as never);

      await service.update(auth, {
        userId: 'u1',
        data: { displayName: '新名', password: 'new', roleIds: ['r1', 'r2'] } as never
      });

      expect(password.hash).toHaveBeenCalledWith('new');
      expect(prisma.authAccount.update).toHaveBeenCalledWith({
        where: { id: 'aa1' },
        data: { passwordHash: 'hashed-pw' }
      });
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { displayName: '新名' } });
      expect(prisma.memberRole.deleteMany).toHaveBeenCalledWith({ where: { memberId: 'm1' } });
      expect(prisma.memberRole.createMany).toHaveBeenCalledWith({
        data: [{ memberId: 'm1', roleId: 'r1' }, { memberId: 'm1', roleId: 'r2' }]
      });
    });

    it('throws NotFound when user does not exist', async () => {
      const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await expect(
        service.update(buildAuth(), { userId: 'missing', data: { displayName: 'x' } as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('throws NotFound when user does not exist', async () => {
      const prisma = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await expect(service.delete(buildAuth(), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes the user', async () => {
      const prisma = {
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: 'u1' }),
          delete: vi.fn().mockResolvedValue({ id: 'u1' })
        }
      };
      const service = new SuperUsersService(prisma as never, buildPasswordService() as never);
      await service.delete(buildAuth(), 'u1');
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });
});
