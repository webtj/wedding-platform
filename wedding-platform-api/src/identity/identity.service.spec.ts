import { describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../common/exceptions/business.exception';
import { IdentityService } from './identity.service';

const buildAccount = (overrides: Record<string, unknown> = {}) => ({
  passwordHash: 'hashed',
  user: {
    id: 'u1',
    displayName: '王',
    platformAdmin: null,
    tenantMembers: [{
      id: 'm1',
      tenantId: 't1',
      status: 'active',
      tenant: { id: 't1', name: '租户', status: 'active', address: null },
      roles: [{
        role: {
          code: 'planner',
          permissions: [{ permission: { code: 'project.read' } }],
          menus: []
        }
      }]
    }],
    ...overrides
  }
});

const buildSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'sess1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  user: buildAccount().user,
  ...overrides
});

const buildPrisma = (overrides: Record<string, unknown> = {}) => ({
  authAccount: { findUnique: vi.fn() },
  refreshSession: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  user: { findUniqueOrThrow: vi.fn() },
  menuItem: { findMany: vi.fn() },
  ...overrides
});

const buildPasswordService = () => ({ verify: vi.fn().mockResolvedValue(true), hash: vi.fn() });
const buildTokenService = () => ({
  issueTokenPair: vi.fn().mockResolvedValue({
    accessToken: 'at', refreshToken: 'rt', accessTokenExpiresAt: new Date(), refreshTokenExpiresAt: new Date()
  }),
  hashRefreshToken: vi.fn().mockReturnValue('hashed-rt')
});

describe('IdentityService', () => {
  describe('login', () => {
    it('throws AUTH_INVALID_CREDENTIALS when account is not found', async () => {
      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue(null);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);
      await expect(service.login({ identifier: 'unknown', password: 'pw' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('throws AUTH_INVALID_CREDENTIALS when password hash is null', async () => {
      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue({ passwordHash: null });
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);
      await expect(service.login({ identifier: 'u', password: 'pw' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('throws AUTH_INVALID_CREDENTIALS when password does not match', async () => {
      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue(buildAccount());
      const password = buildPasswordService();
      password.verify = vi.fn().mockResolvedValue(false);
      const service = new IdentityService(prisma as never, password as never, buildTokenService() as never);
      await expect(service.login({ identifier: 'u', password: 'wrong' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('issues tokens + returns user + activeTenant for regular tenant user', async () => {
      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue(buildAccount());
      const password = buildPasswordService();
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, password as never, token as never);

      const result = await service.login({ identifier: 'u', password: 'pw' } as never);

      expect(result.user).toEqual({ id: 'u1', displayName: '王' });
      expect(result.activeTenant).toEqual({ id: 't1', name: '租户' });
      expect(result.permissions).toEqual(['project.read']);
      expect(result.isPlatformAdmin).toBe(false);
      expect(token.issueTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false })
      );
    });

    it('throws AUTH_NO_TENANT when user has no active tenant members', async () => {
      const account = buildAccount({ tenantMembers: [{ ...buildAccount().user.tenantMembers[0], status: 'inactive', tenant: { id: 't1', name: '租户', status: 'active', address: null } }] });
      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue(account);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);
      await expect(service.login({ identifier: 'u', password: 'pw' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('returns platform admin tokens when user has platformAdmin record', async () => {
      const account = buildAccount({ platformAdmin: { level: 'super' }, tenantMembers: [] });
      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue(account);
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      const result = await service.login({ identifier: 'admin', password: 'pw' } as never);

      expect(result.isPlatformAdmin).toBe(true);
      expect(result.platformLevel).toBe('super');
      expect(result.activeTenant).toBeNull();
      expect(token.issueTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', tenantId: null, memberId: null, isPlatformAdmin: true, platformLevel: 'super' })
      );
    });
  });

  describe('refresh', () => {
    it('throws AUTH_REFRESH_FAILED when session is revoked', async () => {
      const prisma = buildPrisma();
      prisma.refreshSession.findUnique = vi.fn().mockResolvedValue({ ...buildSession(), revokedAt: new Date() });
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);
      await expect(service.refresh({ refreshToken: 'rt' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('throws AUTH_REFRESH_FAILED when session is expired', async () => {
      const prisma = buildPrisma();
      prisma.refreshSession.findUnique = vi.fn().mockResolvedValue({
        ...buildSession(),
        expiresAt: new Date(Date.now() - 1000)
      });
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);
      await expect(service.refresh({ refreshToken: 'rt' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('throws AUTH_REFRESH_FAILED when session not found', async () => {
      const prisma = buildPrisma();
      prisma.refreshSession.findUnique = vi.fn().mockResolvedValue(null);
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);
      await expect(service.refresh({ refreshToken: 'rt' } as never)).rejects.toBeInstanceOf(BusinessException);
    });

    it('revokes the old session and issues a new token pair for tenant user', async () => {
      const prisma = buildPrisma();
      prisma.refreshSession.findUnique = vi.fn().mockResolvedValue(buildSession());
      prisma.refreshSession.update = vi.fn().mockResolvedValue({});
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      await service.refresh({ refreshToken: 'rt' } as never);

      expect(prisma.refreshSession.update).toHaveBeenCalledWith({
        where: { id: 'sess1' },
        data: { revokedAt: expect.any(Date) }
      });
      expect(token.issueTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', tenantId: 't1', memberId: 'm1' })
      );
    });

    it('returns platform admin tokens when user is platform admin', async () => {
      const session = buildSession({
        user: { ...buildAccount().user, platformAdmin: { level: 'admin' }, tenantMembers: [] }
      });
      const prisma = buildPrisma();
      prisma.refreshSession.findUnique = vi.fn().mockResolvedValue(session);
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      await service.refresh({ refreshToken: 'rt' } as never);
      expect(token.issueTokenPair).toHaveBeenCalledWith(
        expect.objectContaining({ isPlatformAdmin: true, platformLevel: 'admin' })
      );
    });

    it('throws AUTH_NO_TENANT when tenant user has no active members', async () => {
      const session = buildSession({
        user: { ...buildAccount().user, platformAdmin: null, tenantMembers: [{ id: 'm1', status: 'inactive', tenantId: 't1', tenant: { id: 't1', name: 'x', status: 'inactive', address: null }, roles: [] }] }
      });
      const prisma = buildPrisma();
      prisma.refreshSession.findUnique = vi.fn().mockResolvedValue(session);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);
      await expect(service.refresh({ refreshToken: 'rt' } as never)).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe('logout', () => {
    it('revokes all sessions matching the token hash', async () => {
      const prisma = buildPrisma();
      prisma.refreshSession.updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      const result = await service.logout({ refreshToken: 'rt' } as never);

      expect(result).toEqual({ ok: true });
      expect(token.hashRefreshToken).toHaveBeenCalledWith('rt');
      expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'hashed-rt', revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      });
    });
  });

  describe('me', () => {
    it('returns platform admin with platform menus', async () => {
      const user = {
        id: 'u1',
        displayName: '王',
        platformAdmin: { level: 'super' },
        tenantMembers: []
      };
      const platformMenus = [
        { id: 'pm1', label: '平台管理', href: '/platform', icon: null, sortOrder: 0, parentId: null, children: [] }
      ];
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      prisma.menuItem.findMany = vi.fn().mockResolvedValue(platformMenus);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      expect(result.isPlatformAdmin).toBe(true);
      expect(result.platformLevel).toBe('super');
      expect(result.tenants[0]!.id).toBe('__platform__');
      expect(result.tenants[0]!.menus[0]!.label).toBe('平台管理');
    });

    it('returns tenant user with roles, permissions, and nested menus', async () => {
      const user = {
        id: 'u1',
        displayName: '王',
        platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: '地址' },
          roles: [{
            role: {
              code: 'planner',
              permissions: [{ permission: { code: 'project.read' } }],
              menus: [{
                menuItem: { id: 'menu1', label: '项目', href: '/projects', icon: null, sortOrder: 0, parentId: null }
              }]
            }
          }]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      expect(result.isPlatformAdmin).toBe(false);
      expect(result.tenants[0]!.id).toBe('t1');
      expect(result.tenants[0]!.roles).toEqual(['planner']);
      expect(result.tenants[0]!.permissions).toEqual(['project.read']);
      expect(result.tenants[0]!.menus[0]!.label).toBe('项目');
    });

    it('merges child menus under parent items by parentId', async () => {
      const user = {
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: null },
          roles: [{
            role: {
              code: 'planner',
              permissions: [],
              menus: [
                { menuItem: { id: 'parent1', label: '项目', href: '/projects', icon: null, sortOrder: 0, parentId: null } },
                { menuItem: { id: 'child1', label: '列表', href: '/projects/list', icon: null, sortOrder: 1, parentId: 'parent1' } }
              ]
            }
          }]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      const menus = result.tenants[0]!.menus;
      expect(menus).toHaveLength(1);
      expect(menus[0]!.children).toHaveLength(1);
      expect(menus[0]!.children[0]!.label).toBe('列表');
    });

    it('orphan children (missing parent) are added as top-level items', async () => {
      const user = {
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: null },
          roles: [{
            role: {
              code: 'planner',
              permissions: [],
              menus: [
                { menuItem: { id: 'orphan', label: '孤立菜单', href: '/orphan', icon: null, sortOrder: 0, parentId: 'missing_parent' } }
              ]
            }
          }]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      const menus = result.tenants[0]!.menus;
      expect(menus).toHaveLength(1);
      expect(menus[0]!.parentId).toBeNull();
      expect(menus[0]!.label).toBe('孤立菜单');
    });
  });

  describe('switchTenant', () => {
    const buildMember = (overrides: Record<string, unknown> = {}) => ({
      id: 'm1',
      tenantId: 't1',
      status: 'active',
      tenant: { id: 't1', name: '租户', status: 'active', address: '北京' },
      roles: [{
        role: {
          code: 'planner',
          permissions: [{ permission: { code: 'project.read' } }, { permission: { code: 'project.write' } }]
        }
      }],
      ...overrides
    });

    it('issues scoped tokens with tenantId/memberId/permissions for tenant user', async () => {
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'u1',
        displayName: '王',
        platformAdmin: null,
        tenantMembers: [buildMember()]
      });
      const tokenService = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, tokenService as never);

      const result = await service.switchTenant('u1', { tenantId: 't1' });

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(expect.objectContaining({
        sub: 'u1',
        tenantId: 't1',
        memberId: 'm1',
        isPlatformAdmin: false,
        permissions: ['project.read', 'project.write']
      }));
      expect(result.activeTenant).toEqual({ id: 't1', name: '租户', address: '北京' });
      expect(result.permissions).toEqual(['project.read', 'project.write']);
      expect(result.isPlatformAdmin).toBe(false);
    });

    it('returns null-tenant tokens when platform admin switches to a tenant they have no membership in', async () => {
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'pa1',
        displayName: '平台管理员',
        platformAdmin: { level: 'super' },
        tenantMembers: []
      });
      const tokenService = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, tokenService as never);

      const result = await service.switchTenant('pa1', { tenantId: 't1' });

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(expect.objectContaining({
        sub: 'pa1',
        tenantId: null,
        memberId: null,
        isPlatformAdmin: true,
        platformLevel: 'super'
      }));
      expect(result.activeTenant).toBeNull();
      expect(result.isPlatformAdmin).toBe(true);
      expect(result.platformLevel).toBe('super');
    });

    it('throws PERMISSION_DENIED for regular user with no membership in the requested tenant', async () => {
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: []
      });
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      await expect(service.switchTenant('u1', { tenantId: 't1' })).rejects.toMatchObject({
        errorCode: 'PERMISSION_DENIED'
      });
    });

    it('throws PERMISSION_DENIED when member status is not active', async () => {
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [buildMember({ status: 'suspended' })]
      });
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      await expect(service.switchTenant('u1', { tenantId: 't1' })).rejects.toMatchObject({
        errorCode: 'PERMISSION_DENIED'
      });
    });

    it('throws PERMISSION_DENIED when tenant status is not active', async () => {
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [buildMember({ tenant: { id: 't1', name: '租户', status: 'suspended', address: null } })]
      });
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      await expect(service.switchTenant('u1', { tenantId: 't1' })).rejects.toMatchObject({
        errorCode: 'PERMISSION_DENIED'
      });
    });

    it('revokes the previous refresh token when provided', async () => {
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [buildMember()]
      });
      prisma.refreshSession.updateMany = vi.fn().mockResolvedValue({ count: 1 });
      const tokenService = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, tokenService as never);

      await service.switchTenant('u1', { tenantId: 't1' }, 'old-rt');

      expect(tokenService.hashRefreshToken).toHaveBeenCalledWith('old-rt');
      expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tokenHash: 'hashed-rt', revokedAt: null }),
        data: { revokedAt: expect.any(Date) }
      }));
    });
  });
});
