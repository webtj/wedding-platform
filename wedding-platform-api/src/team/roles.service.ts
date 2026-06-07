import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../identity/token.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService
  ) {}

  async list(input: { tenantId: string; search?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId: input.tenantId, isBuiltIn: false };

    if (input.search) {
      where.OR = [
        { name: { contains: input.search } },
        { code: { contains: input.search } },
        { description: { contains: input.search } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize
      }),
      this.prisma.role.count({ where })
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async create(input: {
    tenantId: string;
    code: string;
    name: string;
    description?: string;
    menuItemIds?: string[];
    permissionCodes?: string[];
    userId: string;
  }) {
    // If menuItemIds are provided, verify the user can assign each menu
    if (input.menuItemIds?.length) {
      for (const menuItemId of input.menuItemIds) {
        const canAssign = await this.canAssignMenu(input.userId, input.tenantId, menuItemId);
        if (!canAssign) {
          throw BusinessException.permissionDenied();
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          tenantId: input.tenantId,
          scope: 'tenant',
          code: input.code,
          name: input.name,
          description: input.description
        }
      });

      if (input.menuItemIds?.length) {
        await tx.roleMenuItem.createMany({
          data: input.menuItemIds.map((menuItemId) => ({
            roleId: role.id,
            menuItemId
          }))
        });
      }

      // v2: permissionCodes are set by one of three paths (mutually exclusive):
      //   1. menuItemIds provided → union of MenuItem.permissionCodes (computed below)
      //   2. permissionCodes provided directly (template application, e.g. ROLE_TEMPLATES.sales)
      //   3. nothing provided → []
      //   Path 2 takes precedence over path 1; otherwise menus win.
      let resolvedPermissionCodes: string[] = [];
      if (input.permissionCodes !== undefined) {
        resolvedPermissionCodes = [...new Set(input.permissionCodes)];
      } else if (input.menuItemIds?.length) {
        const selectedMenus = await tx.menuItem.findMany({
          where: { id: { in: input.menuItemIds } },
          select: { permissionCodes: true }
        });
        const union = new Set<string>();
        for (const m of selectedMenus) {
          for (const code of m.permissionCodes) union.add(code);
        }
        resolvedPermissionCodes = Array.from(union);
      }

      if (resolvedPermissionCodes.length > 0 || input.permissionCodes !== undefined) {
        await tx.role.update({
          where: { id: role.id },
          data: { permissionCodes: resolvedPermissionCodes }
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: { menus: { include: { menuItem: true } } }
      });
    });
  }

  async getById(input: { id: string; tenantId: string }) {
    const role = await this.prisma.role.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
      include: { menus: { include: { menuItem: true } } }
    });

    if (!role) {
      throw BusinessException.notFound('角色');
    }

    return role;
  }

  async update(input: {
    id: string;
    tenantId: string;
    name?: string;
    description?: string;
    menuItemIds?: string[];
    permissionCodes?: string[];
    userId: string;
  }) {
    const existing = await this.prisma.role.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
      include: { members: true }
    });

    if (!existing) {
      throw BusinessException.notFound('角色');
    }

    // Built-in roles cannot be edited
    if (existing.isBuiltIn) {
      throw new BusinessException('VALIDATION_ERROR', '内置角色不可编辑');
    }

    // If menuItemIds are provided, verify the user can assign each menu
    if (input.menuItemIds !== undefined && input.menuItemIds.length > 0) {
      for (const menuItemId of input.menuItemIds) {
        const canAssign = await this.canAssignMenu(input.userId, input.tenantId, menuItemId);
        if (!canAssign) {
          throw BusinessException.permissionDenied();
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description } : {})
        }
      });

      // v2: permissionCodes resolution — same three-path precedence as create()
      //   1. permissionCodes provided directly → use it (template application / manual override)
      //   2. menuItemIds provided → recompute union from selected menus
      //   3. neither provided → leave existing permissionCodes untouched
      if (input.permissionCodes !== undefined) {
        await tx.role.update({
          where: { id: input.id },
          data: { permissionCodes: [...new Set(input.permissionCodes)] }
        });
        await this.tokenService.revokeSessionsByRoleId(input.id);
        await this.incrementTokenVersionForRole(input.id);
      } else if (input.menuItemIds !== undefined) {
        await tx.roleMenuItem.deleteMany({ where: { roleId: input.id } });
        if (input.menuItemIds.length > 0) {
          await tx.roleMenuItem.createMany({
            data: input.menuItemIds.map((menuItemId) => ({
              roleId: input.id,
              menuItemId
            }))
          });
        }
        // Recompute role.permissionCodes from selected menus' permissionCodes (union).
        const selectedMenus =
          input.menuItemIds.length > 0
            ? await tx.menuItem.findMany({
                where: { id: { in: input.menuItemIds } },
                select: { permissionCodes: true }
              })
            : [];
        const union = new Set<string>();
        for (const m of selectedMenus) {
          for (const code of m.permissionCodes) union.add(code);
        }
        await tx.role.update({
          where: { id: input.id },
          data: { permissionCodes: Array.from(union) }
        });
        await this.tokenService.revokeSessionsByRoleId(input.id);
        await this.incrementTokenVersionForRole(input.id);
      }

      return tx.role.findUniqueOrThrow({
        where: { id: input.id },
        include: { menus: { include: { menuItem: true } } }
      });
    });
  }

  async delete(input: { id: string; tenantId: string }) {
    const existing = await this.prisma.role.findFirst({
      where: { id: input.id, tenantId: input.tenantId },
      include: { members: true }
    });

    if (!existing) {
      throw BusinessException.notFound('角色');
    }

    // Built-in roles cannot be deleted
    if (existing.isBuiltIn) {
      throw new BusinessException('VALIDATION_ERROR', '内置角色不可删除');
    }

    // Check if role is in use
    if (existing.members.length > 0) {
      throw new BusinessException('VALIDATION_ERROR', '该角色下仍有成员，无法删除');
    }

    await this.prisma.role.delete({ where: { id: input.id } });
    return { deleted: true };
  }

  async assignMenus(input: { id: string; tenantId: string; menuItemIds: string[]; userId: string }) {
    const role = await this.prisma.role.findFirst({
      where: { id: input.id, tenantId: input.tenantId }
    });

    if (!role) {
      throw BusinessException.notFound('角色');
    }

    // Verify the user can assign each menu
    for (const menuItemId of input.menuItemIds) {
      const canAssign = await this.canAssignMenu(input.userId, input.tenantId, menuItemId);
      if (!canAssign) {
        throw BusinessException.permissionDenied();
      }
    }

    await this.prisma.roleMenuItem.deleteMany({ where: { roleId: input.id } });
    if (input.menuItemIds.length > 0) {
      await this.prisma.roleMenuItem.createMany({
        data: input.menuItemIds.map((menuItemId) => ({
          roleId: input.id,
          menuItemId
        }))
      });
    }

    // Recompute role.permissionCodes from selected menus' permissionCodes (union).
    const selectedMenus =
      input.menuItemIds.length > 0
        ? await this.prisma.menuItem.findMany({
            where: { id: { in: input.menuItemIds } },
            select: { permissionCodes: true }
          })
        : [];
    const union = new Set<string>();
    for (const m of selectedMenus) {
      for (const code of m.permissionCodes) union.add(code);
    }
    await this.prisma.role.update({
      where: { id: input.id },
      data: { permissionCodes: Array.from(union) }
    });

    return { success: true };
  }

  async getTenantMenus(tenantId: string) {
    return this.prisma.menuItem.findMany({
      where: { tenantId, scope: 'tenant', parentId: null },
      include: { children: { where: { scope: 'tenant' }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });
  }

  async canAssignMenu(userId: string, tenantId: string, menuItemId: string): Promise<boolean> {
    // Verify the menu item exists and belongs to the same tenant
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, tenantId }
    });

    if (!menuItem) {
      return false;
    }

    // Check if the user has access to this menu through one of their roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantMembers: {
          where: { tenantId, status: 'active' },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    menus: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return false;
    }

    for (const member of user.tenantMembers) {
      for (const memberRole of member.roles) {
        const hasMenu = memberRole.role.menus.some((rm) => rm.menuItemId === menuItemId);
        if (hasMenu) {
          return true;
        }
      }
    }

    return false;
  }

  private async incrementTokenVersionForRole(roleId: string): Promise<void> {
    const memberRoles = await this.prisma.memberRole.findMany({
      where: { roleId },
      select: { member: { select: { userId: true } } }
    });
    const userIds = [...new Set(memberRoles.map((mr) => mr.member.userId))];
    for (const userId of userIds) {
      await this.tokenService.incrementTokenVersion(userId);
    }
  }
}
