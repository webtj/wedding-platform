import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthProvider } from '@prisma/client';
import { LoginResponse } from '@wedding/shared';
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await this.passwordService.verify(input.password, account.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = account.user;
    const activeMember = this.pickActiveMember(user.tenantMembers);
    const permissions = this.collectPermissions(user.isPlatformAdmin, activeMember);
    const tokens = await this.tokenService.issueTokenPair({
      sub: user.id,
      tenantId: activeMember?.tenantId ?? null,
      memberId: activeMember?.id ?? null
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        displayName: user.displayName,
        isPlatformAdmin: user.isPlatformAdmin
      },
      activeTenant: activeMember
        ? {
            id: activeMember.tenant.id,
            name: activeMember.tenant.name,
          }
        : null,
      permissions
    };
  }

  async refresh(input: RefreshDto) {
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
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

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const activeMember = session.user.tenantMembers.find((member) => member.status === 'active') ?? null;
    return this.tokenService.issueTokenPair({
      sub: session.userId,
      tenantId: activeMember?.tenantId ?? null,
      memberId: activeMember?.id ?? null
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
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Platform admins get menus from super_admin role
    let platformMenus: any[] = [];
    if (user.isPlatformAdmin) {
      const superAdminRole = await this.prisma.role.findFirst({
        where: { code: 'super_admin', scope: 'platform', tenantId: null },
        include: {
          menus: {
            include: {
              menuItem: {
                include: { children: { where: { visible: true }, orderBy: { sortOrder: 'asc' } } }
              }
            }
          }
        }
      });
      if (superAdminRole) {
        const menuItems = superAdminRole.menus.map((rm) => rm.menuItem).filter((m) => m.parentId === null);
        platformMenus = menuItems.map((m) => ({
          id: m.id,
          label: m.label,
          href: m.href,
          icon: m.icon,
          sortOrder: m.sortOrder,
          parentId: m.parentId,
          children: m.children.map((c) => ({
            id: c.id,
            label: c.label,
            href: c.href,
            icon: c.icon,
            sortOrder: c.sortOrder
          }))
        }));
      }
    }

    const tenants = user.tenantMembers.map((member) => {
      const roleCodes = member.roles.map((mr) => mr.role.code);

      // Collect unique menu items from all roles
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
              children: item.children.map((c) => ({
                id: c.id,
                label: c.label,
                href: c.href,
                icon: c.icon,
                sortOrder: c.sortOrder
              }))
            });
          }
        }
      }

      let menus;
      if (user.isPlatformAdmin) {
        menus = platformMenus;
      } else {
        // Build tree: collect parent items, nest children under them
        const allItems = Array.from(menuMap.values());
        const parentItems = allItems.filter((m) => !m.parentId);
        const childItems = allItems.filter((m) => m.parentId);
        // Ensure children are nested under their parents
        for (const child of childItems) {
          const parent = parentItems.find((p) => p.id === child.parentId);
          if (parent && !parent.children.some((c: any) => c.id === child.id)) {
            parent.children.push(child);
          }
        }
        menus = parentItems;
      }

      return {
        id: member.tenant.id,
        name: member.tenant.name,
        address: member.tenant.address,
        memberId: member.id,
        roles: roleCodes,
        menus: menus.sort((a, b) => a.sortOrder - b.sortOrder)
      };
    });

    return {
      id: user.id,
      displayName: user.displayName,
      isPlatformAdmin: user.isPlatformAdmin,
      tenants
    };
  }

  private pickActiveMember(members: LoginMember[]) {
    const activeMembers = members.filter((member) => member.status === 'active' && member.tenant.status === 'active');
    return activeMembers[0] ?? null;
  }

  private collectPermissions(isPlatformAdmin: boolean, member: LoginMember | null) {
    if (isPlatformAdmin) {
      return ['*'];
    }
    if (!member) {
      return [];
    }
    return Array.from(
      new Set(
        member.roles.flatMap((memberRole) =>
          memberRole.role.permissions.map((rolePermission) => rolePermission.permission.code)
        )
      )
    );
  }
}
