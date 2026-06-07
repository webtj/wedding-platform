import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { BUILT_IN_ROLE_PERMISSIONS, LoginResponse } from '@wedding/shared';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { LoginDto, RefreshDto, SwitchTenantDto } from './dto';

type MenuNode = {
  id: string;
  label: string;
  href: string | null;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  children: MenuNode[];
};

type LoginMember = {
  id: string;
  tenantId: string;
  status: string;
  createdAt: Date;
  tenant: {
    id: string;
    name: string;
    status: string;
  };
  roles: Array<{
    role: {
      code: string;
      permissionCodes: string[];
    };
  }>;
};

type TenantMemberWithRelations = {
  id: string;
  tenantId: string;
  status: string;
  tenant: { id: string; name: string; address: string | null; status: string };
  roles: Array<{
    role: {
      code: string;
      permissionCodes: string[];
      menus: Array<{
        menuItem: {
          id: string;
          label: string;
          href: string | null;
          icon: string | null;
          sortOrder: number;
          parentId: string | null;
          children: Array<{
            id: string;
            label: string;
            href: string | null;
            icon: string | null;
            sortOrder: number;
          }>;
        };
      }>;
    };
  }>;
};

@Injectable()
export class IdentityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService
  ) {}

  async login(input: LoginDto): Promise<LoginResponse> {
    const account = await this.prisma.authAccount.findUnique({
      where: {
        provider_identifier: {
          provider: AuthProvider.password,
          identifier: input.identifier
        }
      },
      include: {
        user: {
          include: {
            platformAdmin: true,
            tenantMembers: {
              orderBy: { createdAt: 'asc' },
              include: {
                tenant: true,
                roles: {
                  include: {
                    role: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!account?.passwordHash) {
      throw new BusinessException('AUTH_INVALID_CREDENTIALS', '账号或密码错误', 401);
    }

    const passwordOk = await this.passwordService.verify(input.password, account.passwordHash);
    if (!passwordOk) {
      throw new BusinessException('AUTH_INVALID_CREDENTIALS', '账号或密码错误', 401);
    }

    const user = account.user;
    const isPlatformAdmin = !!user.platformAdmin;

    if (isPlatformAdmin) {
      // Platform admin: no tenant context (tenant selected via switch-tenant)
      const tokens = await this.tokenService.issueTokenPair({
        sub: user.id,
        tenantId: null,
        memberId: null,
        isPlatformAdmin: true,
        platformLevel: user.platformAdmin!.level as 'super' | 'admin',
        permissions: [],
        tokenVersion: user.tokenVersion ?? 0
      });

      return {
        ...tokens,
        user: { id: user.id, displayName: user.displayName },
        activeTenant: null,
        permissions: [],
        isPlatformAdmin: true,
        platformLevel: user.platformAdmin!.level as 'super' | 'admin'
      };
    }

    // Regular tenant user
    const activeMember = this.pickActiveMember(user.tenantMembers, user.lastActiveTenantId);
    if (!activeMember) {
      throw new BusinessException('AUTH_NO_TENANT', '用户未关联任何租户', 403);
    }

    const permissions = this.collectPermissions(activeMember);
    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      tenantId: activeMember.tenantId,
      memberId: activeMember.id,
      isPlatformAdmin: false,
      permissions,
      tokenVersion: user.tokenVersion ?? 0
    });

    return {
      ...tokens,
      user: { id: user.id, displayName: user.displayName },
      activeTenant: { id: activeMember.tenant.id, name: activeMember.tenant.name },
      permissions,
      isPlatformAdmin: false
    };
  }

  async refresh(input: RefreshDto) {
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            platformAdmin: true,
            tenantMembers: {
              orderBy: { createdAt: 'asc' },
              include: {
                tenant: true,
                roles: {
                  include: {
                    role: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new BusinessException('AUTH_REFRESH_FAILED', '登录已过期，请重新登录', 401);
    }

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    const user = session.user;
    const isPlatformAdmin = !!user.platformAdmin;

    if (isPlatformAdmin) {
      return this.tokenService.issueTokenPair({
        sub: user.id,
        tenantId: null,
        memberId: null,
        isPlatformAdmin: true,
        platformLevel: user.platformAdmin!.level as 'super' | 'admin',
        permissions: [],
        tokenVersion: user.tokenVersion ?? 0
      });
    }

    const activeMember = this.pickActiveMember(user.tenantMembers, user.lastActiveTenantId);
    if (!activeMember) {
      throw new BusinessException('AUTH_NO_TENANT', '用户未关联任何租户', 403);
    }

    const permissions = this.collectPermissions(activeMember);
    return this.tokenService.issueTokenPair({
      sub: user.id,
      tenantId: activeMember.tenantId,
      memberId: activeMember.id,
      isPlatformAdmin: false,
      permissions,
      tokenVersion: user.tokenVersion ?? 0
    });
  }

  async logout(input: RefreshDto) {
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
    return { ok: true };
  }

  /**
   * Switch active tenant for an authenticated user.
   *
   * Use cases:
   * 1. Platform admin: must call this before hitting any tenant-scoped API.
   * 2. Regular user with multiple memberships: switches active tenant context.
   *
   * Returns a fresh access/refresh token pair bound to the target tenant,
   * plus the active member's permissions so the client can re-render the UI
   * without an extra /me call.
   *
   * The caller's previous refresh token (required by the DTO) is validated
   * and revoked so the previous (potentially null-tenant) JWT cannot be
   * replayed. Zod enforces the field is present so a client cannot skip the
   * revoke and silently leave the old session alive.
   */
  async switchTenant(userId: string, input: SwitchTenantDto) {
    // Reject revoked/expired previous refresh tokens BEFORE issuing a new
    // token pair. Without this, a client that lost a session (logged out,
    // evicted, etc.) could keep re-using a snapshot of the old refresh token
    // to issue new pairs.
    const previousRefreshToken = input.refreshToken;
    if (!previousRefreshToken) {
      throw new BusinessException('AUTH_REFRESH_FAILED', '缺少刷新令牌', 401);
    }
    {
      const tokenHash = this.tokenService.hashRefreshToken(previousRefreshToken);
      const previousSession = await this.prisma.refreshSession.findUnique({
        where: { tokenHash }
      });
      if (
        !previousSession ||
        previousSession.revokedAt ||
        previousSession.expiresAt.getTime() <= Date.now() ||
        previousSession.userId !== userId
      ) {
        throw new BusinessException(
          'AUTH_REFRESH_FAILED',
          '登录已过期，请重新登录',
          401
        );
      }
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        platformAdmin: true,
        tenantMembers: {
          where: { tenantId: input.tenantId },
          orderBy: { createdAt: 'asc' },
          include: {
            tenant: true,
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    const isPlatformAdmin = !!user.platformAdmin;
    const member = user.tenantMembers[0];

    // Privacy boundary: platform admins are sandboxed to /admin/*. They MUST
    // NOT be able to issue tenant-scoped JWTs. Platform admins have no tenant
    // memberships (the seed ensures root is platform-only). Their console for
    // tenant operations is at /admin/* and they go through the platform APIs
    // there, not switch-tenant.
    if (isPlatformAdmin) {
      throw new BusinessException(
        'PERMISSION_DENIED',
        'Platform admins cannot access tenant data; use /admin/*',
        403
      );
    }
    if (!member) {
      throw new BusinessException('PERMISSION_DENIED', 'No access to this tenant', 403);
    }
    if (member.status !== 'active') {
      throw new BusinessException('PERMISSION_DENIED', 'Membership is not active', 403);
    }
    if (member.tenant.status !== 'active') {
      throw new BusinessException('PERMISSION_DENIED', 'Tenant is not active', 403);
    }

    // Read role.permissionCodes as the single source of truth, with the same
    // built-in fallback as login() — see collectPermissions() for rationale.
    const codes = new Set<string>();
    for (const mr of member.roles) {
      if (mr.role.permissionCodes.length > 0) {
        for (const code of mr.role.permissionCodes) codes.add(code);
      } else {
        const fallback = BUILT_IN_ROLE_PERMISSIONS[mr.role.code];
        if (fallback) {
          for (const code of fallback) codes.add(code);
        }
      }
    }
    const permissions = Array.from(codes);

    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      tenantId: member.tenantId,
      memberId: member.id,
      isPlatformAdmin,
      platformLevel: user.platformAdmin?.level as 'super' | 'admin' | undefined,
      permissions,
      tokenVersion: user.tokenVersion ?? 0
    });

    if (previousRefreshToken) {
      await this.revokeRefreshToken(previousRefreshToken);
    }

    // Persist the user's last-active tenant so the next login() can default
    // to it (and so /me + switchTenant ordering is consistent across sessions).
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveTenantId: input.tenantId }
    });

    return {
      ...tokens,
      user: { id: user.id, displayName: user.displayName },
      activeTenant: {
        id: member.tenant.id,
        name: member.tenant.name,
        address: member.tenant.address
      },
      permissions,
      isPlatformAdmin,
      platformLevel: user.platformAdmin?.level ?? null
    };
  }

  /**
   * Revoke a refresh token. Idempotent: silently ignores unknown/already-revoked hashes.
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        platformAdmin: true,
        tenantMembers: {
          orderBy: { createdAt: 'asc' },
          include: {
            tenant: true,
            roles: {
              include: {
                role: {
                  include: {
                    menus: {
                      include: {
                        menuItem: {
                          include: { children: { orderBy: { sortOrder: 'asc' } } }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const isPlatformAdmin = !!user.platformAdmin;

    // Platform admin: return platform menus only. We deliberately do NOT leak
    // the platform admin's tenant memberships into `tenants[]` — a platform
    // admin's job is to manage the SaaS infrastructure, not to view any
    // tenant's business data. If they need tenant-level access, they should
    // log in with a tenant-member account.
    if (isPlatformAdmin) {
      const platformMenuRows = await this.prisma.menuItem.findMany({
        where: { scope: 'platform', parentId: null },
        include: { children: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' }
      });

      const platformMenus: MenuNode[] = platformMenuRows.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        sortOrder: item.sortOrder,
        parentId: item.parentId,
        children: item.children.map((c) => ({
          id: c.id,
          label: c.label,
          href: c.href,
          icon: c.icon,
          sortOrder: c.sortOrder,
          parentId: c.parentId,
          children: []
        }))
      }));

      return {
        id: user.id,
        displayName: user.displayName,
        isPlatformAdmin: true,
        platformLevel: user.platformAdmin!.level,
        platformMenus,
        tenants: []
      };
    }

    // Regular tenant user: existing flow
    const tenants = user.tenantMembers.map((member) => this.buildTenantView(member));

    return {
      id: user.id,
      displayName: user.displayName,
      isPlatformAdmin: false,
      tenants
    };
  }

  private buildTenantView(member: TenantMemberWithRelations) {
    const roleCodes = member.roles.map((mr) => mr.role.code);
    // Single source of truth: role.permissionCodes (with built-in fallback).
    // See collectPermissions() for full rationale.
    const codes = new Set<string>();
    for (const mr of member.roles) {
      if (mr.role.permissionCodes.length > 0) {
        for (const code of mr.role.permissionCodes) codes.add(code);
      } else {
        const fallback = BUILT_IN_ROLE_PERMISSIONS[mr.role.code];
        if (fallback) {
          for (const code of fallback) codes.add(code);
        }
      }
    }
    const permissions = Array.from(codes);

    const menuMap = new Map<string, MenuNode>();
    for (const mr of member.roles) {
      for (const rm of mr.role.menus) {
        const item = rm.menuItem;
        if (!menuMap.has(item.id)) {
          menuMap.set(item.id, {
            id: item.id,
            label: item.label,
            href: item.href,
            icon: item.icon,
            sortOrder: item.sortOrder,
            parentId: item.parentId,
            children: []
          });
        }
      }
    }

    const allItems = Array.from(menuMap.values());
    const parentItems = allItems.filter((m) => !m.parentId);
    const childItems = allItems.filter((m) => m.parentId);
    for (const child of childItems) {
      const parent = parentItems.find((p) => p.id === child.parentId);
      if (parent && !parent.children.some((c) => c.id === child.id)) {
        parent.children.push(child);
      } else if (!parent) {
        child.parentId = null;
        parentItems.push(child);
      }
    }

    return {
      id: member.tenant.id,
      name: member.tenant.name,
      address: member.tenant.address,
      memberId: member.id,
      roles: roleCodes,
      permissions,
      menus: parentItems.sort((a, b) => a.sortOrder - b.sortOrder)
    };
  }

  /**
   * Pick the tenant-scoped member used to issue tokens.
   *
   * Stability matters: login() and refresh() both funnel through here for
   * multi-tenant users, and switchTenant() relies on the same ordering
   * being predictable. So we sort by createdAt asc — the same order Prisma
   * returns from the includes above, mirrored in JS in case the includes
   * ever stop carrying orderBy.
   *
   * If `preferredTenantId` is set (the user's `lastActiveTenantId` written
   * by switchTenant) and that tenant is still an active membership, prefer
   * it. Otherwise fall through to the oldest-first default.
   */
  private pickActiveMember(
    members: LoginMember[],
    preferredTenantId?: string | null
  ) {
    const activeMembers = members.filter(
      (member) => member.status === 'active' && member.tenant.status === 'active'
    );
    activeMembers.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (preferredTenantId) {
      const preferred = activeMembers.find((m) => m.tenantId === preferredTenantId);
      if (preferred) return preferred;
    }
    return activeMembers[0] ?? null;
  }

  /**
   * Collects the union of permission codes across all roles held by the member.
   *
   * Source of truth: `role.permissionCodes` (materialized from selected menus'
   * `permissionCodes` unions at assign-time). This makes the menu editor the
   * single place that controls what a role can do at the API level.
   *
   * Fallback for built-in roles: if the DB row's `permissionCodes` is empty
   * (e.g. fresh seed before menus get assigned), fall back to the in-code
   * `BUILT_IN_ROLE_PERMISSIONS` map so the planner still has access on first
   * login. Custom roles never hit this branch.
   */
  private collectPermissions(member: LoginMember) {
    const codes = new Set<string>();
    for (const { role } of member.roles) {
      if (role.permissionCodes.length > 0) {
        for (const code of role.permissionCodes) codes.add(code);
      } else {
        const fallback = BUILT_IN_ROLE_PERMISSIONS[role.code];
        if (fallback) {
          for (const code of fallback) codes.add(code);
        }
      }
    }
    return Array.from(codes);
  }
}
