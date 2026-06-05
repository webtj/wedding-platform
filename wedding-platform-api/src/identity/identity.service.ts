import { Injectable } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { LoginResponse } from '@wedding/shared';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { LoginDto, RefreshDto } from './dto';

type LoginMember = {
  id: string;
  tenantId: string;
  status: string;
  tenant: {
    id: string;
    name: string;
    status: string;
  };
  roles: Array<{
    role: {
      code: string;
      permissions: Array<{
        permission: {
          code: string;
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
              include: {
                tenant: true,
                roles: {
                  include: {
                    role: {
                      include: {
                        permissions: {
                          include: {
                            permission: true
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
      // Platform admin: no tenant context needed
      const tokens = await this.tokenService.issueTokenPair({
        sub: user.id,
        tenantId: null,
        memberId: null,
        isPlatformAdmin: true,
        platformLevel: user.platformAdmin!.level as 'super' | 'admin',
        permissions: []
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
    const activeMember = this.pickActiveMember(user.tenantMembers);
    if (!activeMember) {
      throw new BusinessException('AUTH_NO_TENANT', '用户未关联任何租户', 403);
    }

    const permissions = this.collectPermissions(activeMember);
    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      tenantId: activeMember.tenantId,
      memberId: activeMember.id,
      isPlatformAdmin: false,
      permissions
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
              include: {
                tenant: true,
                roles: {
                  include: {
                    role: {
                      include: {
                        permissions: {
                          include: { permission: true }
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
        permissions: []
      });
    }

    const activeMember = this.pickActiveMember(user.tenantMembers);
    if (!activeMember) {
      throw new BusinessException('AUTH_NO_TENANT', '用户未关联任何租户', 403);
    }

    const permissions = this.collectPermissions(activeMember);
    return this.tokenService.issueTokenPair({
      sub: user.id,
      tenantId: activeMember.tenantId,
      memberId: activeMember.id,
      isPlatformAdmin: false,
      permissions
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

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        platformAdmin: true,
        tenantMembers: {
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
                    },
                    permissions: {
                      include: { permission: true }
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

    // Platform admin: return platform menus
    if (isPlatformAdmin) {
      const platformMenus = await this.prisma.menuItem.findMany({
        where: { scope: 'platform', parentId: null },
        include: { children: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' }
      });

      return {
        id: user.id,
        displayName: user.displayName,
        isPlatformAdmin: true,
        platformLevel: user.platformAdmin!.level,
        tenants: [{
          id: '__platform__',
          name: '平台管理',
          memberId: '',
          roles: ['platform_admin'],
          permissions: [],
          menus: platformMenus.map((item) => ({
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
              sortOrder: c.sortOrder
            }))
          }))
        }]
      };
    }

    // Regular tenant user: existing flow
    const tenants = user.tenantMembers.map((member) => {
      const roleCodes = member.roles.map((mr) => mr.role.code);
      const permissions = Array.from(
        new Set(
          member.roles.flatMap((mr) =>
            mr.role.permissions.map((rp) => rp.permission.code)
          )
        )
      );

      const menuMap = new Map<string, any>();
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
        if (parent && !parent.children.some((c: any) => c.id === child.id)) {
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
        menus: parentItems.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      };
    });

    return {
      id: user.id,
      displayName: user.displayName,
      isPlatformAdmin: false,
      tenants
    };
  }

  private pickActiveMember(members: LoginMember[]) {
    const activeMembers = members.filter((member) => member.status === 'active' && member.tenant.status === 'active');
    return activeMembers[0] ?? null;
  }

  private collectPermissions(member: LoginMember) {
    return Array.from(
      new Set(
        member.roles.flatMap((memberRole) =>
          memberRole.role.permissions.map((rolePermission) => rolePermission.permission.code)
        )
      )
    );
  }
}
