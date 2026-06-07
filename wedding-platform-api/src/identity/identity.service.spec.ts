import { describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../common/exceptions/business.exception';
import { IdentityService } from './identity.service';
import { switchTenantDtoSchema } from './dto';

const DEFAULT_MEMBER_CREATED_AT = new Date('2024-01-01T00:00:00Z');

const buildAccount = (overrides: Record<string, unknown> = {}) => ({
  passwordHash: 'hashed',
  user: {
    id: 'u1',
    displayName: '王',
    platformAdmin: null,
    lastActiveTenantId: null,
    tenantMembers: [{
      id: 'm1',
      tenantId: 't1',
      status: 'active',
      createdAt: DEFAULT_MEMBER_CREATED_AT,
      tenant: { id: 't1', name: '租户', status: 'active', address: null },
      roles: [{
        role: {
          code: 'planner',
          permissionCodes: ['project.read'],
          menus: []
        }
      }]
    }],
    ...overrides
  }
});

const buildMultiTenantAccount = (members: Record<string, unknown>[]) => ({
  passwordHash: 'hashed',
  user: {
    id: 'u1',
    displayName: '王',
    platformAdmin: null,
    lastActiveTenantId: null,
    tenantMembers: members
  }
});

const buildSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'sess1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + 86400000),
  user: buildAccount().user,
  ...overrides
});

const buildPrisma = (overrides: Record<string, unknown> = {}) => {
  // Default: a valid previous session so switchTenant's revoke precheck passes.
  // Tests that exercise the revoked/expired path override this on the specific
  // prisma instance they construct.
  const defaultValidSession = {
    id: 'sess-prev',
    userId: 'u1',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
  return {
    authAccount: { findUnique: vi.fn() },
    refreshSession: {
      findUnique: vi.fn().mockResolvedValue(defaultValidSession),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn().mockResolvedValue({})
    },
    menuItem: { findMany: vi.fn() },
    ...overrides
  };
};

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
      // Platform menus are exposed as a separate top-level field, NOT a fake tenant
      expect(result.platformMenus?.[0]?.label).toBe('平台管理');
      expect(result.tenants).toEqual([]);
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
              permissionCodes: ['project.read'],
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
              permissionCodes: [],
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
              permissionCodes: [],
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

    it('v2: collects permissions from role.permissionCodes (single source of truth, ignores legacy permissions join)', async () => {
      // Legacy RolePermission join has 1 code, role.permissionCodes has 2 different codes.
      // v2 path: the join is ignored; only role.permissionCodes is used.
      const user = {
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: null },
          roles: [{
            role: {
              code: 'custom_sales',
              permissionCodes: ['lead.read', 'contract.read'],
              menus: []
            }
          }]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      expect(result.tenants[0]!.permissions).toEqual(['lead.read', 'contract.read']);
      expect(result.tenants[0]!.permissions).not.toContain('legacy.ignored');
    });

    it('v2: built-in role with empty permissionCodes falls back to BUILT_IN_ROLE_PERMISSIONS (planner)', async () => {
      // Fresh seed scenario: planner role row exists but menus haven't been assigned yet
      const user = {
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: null },
          roles: [{
            role: { code: 'planner', permissionCodes: [], menus: [] }
          }]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      // BUILT_IN_ROLE_PERMISSIONS.planner fallback should kick in
      expect(result.tenants[0]!.permissions.length).toBeGreaterThan(0);
      expect(result.tenants[0]!.permissions).toContain('project.read');
    });

    it('v2: custom role with empty permissionCodes and no BUILT_IN fallback returns [] (no leakage)', async () => {
      const user = {
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: null },
          roles: [{
            role: { code: 'custom_niche', permissionCodes: [], menus: [] }
          }]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      // No fallback for non-built-in role with empty permissionCodes
      expect(result.tenants[0]!.permissions).toEqual([]);
    });

    it('v2: union of multiple roles permissionCodes (dedup)', async () => {
      const user = {
        id: 'u1', displayName: '王', platformAdmin: null,
        tenantMembers: [{
          id: 'm1',
          tenant: { id: 't1', name: '租户', address: null },
          roles: [
            { role: { code: 'r1', permissionCodes: ['a.read', 'b.read'], menus: [] } },
            { role: { code: 'r2', permissionCodes: ['b.read', 'c.read'], menus: [] } }
          ]
        }]
      };
      const prisma = buildPrisma();
      prisma.user.findUniqueOrThrow = vi.fn().mockResolvedValue(user);
      const service = new IdentityService(prisma as never, buildPasswordService() as never, buildTokenService() as never);

      const result = await service.me('u1');
      // Dedup: a.read + b.read + c.read = 3
      expect(result.tenants[0]!.permissions).toEqual(['a.read', 'b.read', 'c.read']);
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
          permissionCodes: ['project.read', 'project.write']
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

      const result = await service.switchTenant('u1', { tenantId: 't1', refreshToken: 'old-rt' });

      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(expect.objectContaining({
        sub: 'u1',
        tenantId: 't1',
        memberId: 'm1',
        isPlatformAdmin: false
      }));
    });

    it('login() picks the OLDEST active member when no lastActiveTenantId is set', async () => {
      // Prisma order is non-deterministic; the service must sort explicitly.
      // We hand it members in REVERSE chronological order to prove the sort
      // is doing the work, not relying on include orderBy.
      const newest = buildMember({ id: 'm-new', tenantId: 't-new', createdAt: new Date('2024-03-01T00:00:00Z'), tenant: { id: 't-new', name: 'newest', status: 'active', address: null } });
      const middle = buildMember({ id: 'm-mid', tenantId: 't-mid', createdAt: new Date('2024-02-01T00:00:00Z'), tenant: { id: 't-mid', name: 'middle', status: 'active', address: null } });
      const oldest = buildMember({ id: 'm-old', tenantId: 't-old', createdAt: new Date('2024-01-01T00:00:00Z'), tenant: { id: 't-old', name: 'oldest', status: 'active', address: null } });

      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue(buildMultiTenantAccount([newest, middle, oldest]));
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      const result = await service.login({ identifier: 'u', password: 'pw' } as never);

      expect(result.activeTenant).toEqual({ id: 't-old', name: 'oldest' });
      expect(token.issueTokenPair).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-old', memberId: 'm-old' }));
    });

    it('login() prefers lastActiveTenantId when it points to an active member', async () => {
      const newer = buildMember({ id: 'm-new', tenantId: 't-new', createdAt: new Date('2024-03-01T00:00:00Z'), tenant: { id: 't-new', name: 'newer', status: 'active', address: null } });
      const older = buildMember({ id: 'm-old', tenantId: 't-old', createdAt: new Date('2024-01-01T00:00:00Z'), tenant: { id: 't-old', name: 'older', status: 'active', address: null } });

      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue({
        ...buildMultiTenantAccount([newer, older]),
        user: { ...buildMultiTenantAccount([newer, older]).user, lastActiveTenantId: 't-new' }
      });
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      const result = await service.login({ identifier: 'u', password: 'pw' } as never);

      // lastActiveTenantId wins over createdAt asc
      expect(result.activeTenant).toEqual({ id: 't-new', name: 'newer' });
      expect(token.issueTokenPair).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 't-new' }));
    });

    it('login() falls back to createdAt asc when lastActiveTenantId is not an active membership', async () => {
      const older = buildMember({ id: 'm-old', tenantId: 't-old', createdAt: new Date('2024-01-01T00:00:00Z'), tenant: { id: 't-old', name: 'older', status: 'active', address: null } });
      const newer = buildMember({ id: 'm-new', tenantId: 't-new', createdAt: new Date('2024-03-01T00:00:00Z'), tenant: { id: 't-new', name: 'newer', status: 'active', address: null } });

      const prisma = buildPrisma();
      prisma.authAccount.findUnique = vi.fn().mockResolvedValue({
        ...buildMultiTenantAccount([newer, older]),
        user: { ...buildMultiTenantAccount([newer, older]).user, lastActiveTenantId: 't-removed' }
      });
      const token = buildTokenService();
      const service = new IdentityService(prisma as never, buildPasswordService() as never, token as never);

      const result = await service.login({ identifier: 'u', password: 'pw' } as never);

      // Stale lastActiveTenantId → fall back to oldest-first
      expect(result.activeTenant).toEqual({ id: 't-old', name: 'older' });
    });
  });

  describe('switchTenantDtoSchema', () => {
    it('accepts a body with tenantId + refreshToken', () => {
      const dto = switchTenantDtoSchema.parse({ tenantId: 't1', refreshToken: 'rt' });
      expect(dto).toEqual({ tenantId: 't1', refreshToken: 'rt' });
    });

    it('rejects a body without refreshToken (security: must force client to send old token for revoke)', () => {
      expect(() => switchTenantDtoSchema.parse({ tenantId: 't1' })).toThrow();
    });

    it('rejects a body with an empty refreshToken', () => {
      expect(() => switchTenantDtoSchema.parse({ tenantId: 't1', refreshToken: '' })).toThrow();
    });
  });
});
