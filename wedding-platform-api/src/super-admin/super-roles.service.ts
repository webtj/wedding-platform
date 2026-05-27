import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AssignRoleMenusInput, CreateTenantRoleInput, UpdateTenantRoleInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { search?: string; tenantId?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.tenantId) {
      where.OR = [
        { tenantId: null, scope: 'platform' },
        { tenantId: params.tenantId, scope: 'tenant' }
      ];
    }
    if (params.search) {
      const searchWhere = [
        { name: { contains: params.search } },
        { code: { contains: params.search } },
        { description: { contains: params.search } }
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR as any[] }, { OR: searchWhere }];
        delete where.OR;
      } else {
        where.OR = searchWhere;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: { include: { permission: true } },
          menus: { include: { menuItem: true } },
          _count: { select: { members: true } }
        },
        orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }],
        skip,
        take: pageSize
      }),
      this.prisma.role.count({ where })
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: { include: { permission: true } },
        menus: { include: { menuItem: true } },
        _count: { select: { members: true } }
      }
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role;
  }

  async create(input: CreateTenantRoleInput) {
    const existing = await this.prisma.role.findFirst({
      where: { code: input.code, scope: 'platform' }
    });
    if (existing) {
      throw new ConflictException('角色 code 已存在');
    }
    const role = await this.prisma.role.create({
      data: {
        scope: 'platform',
        code: input.code,
        name: input.name,
        description: input.description
      }
    });
    if (input.permissionCodes.length > 0) {
      const permissions = await this.prisma.permission.findMany({
        where: { code: { in: input.permissionCodes } }
      });
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id }))
      });
    }
    return this.getById(role.id);
  }

  async update(roleId: string, input: UpdateTenantRoleInput) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isBuiltIn) {
      throw new ForbiddenException('内置角色不可修改');
    }
    return this.prisma.role.update({
      where: { id: roleId },
      data: input,
      include: {
        permissions: { include: { permission: true } },
        menus: { include: { menuItem: true } },
        _count: { select: { members: true } }
      }
    });
  }

  async delete(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { members: true } } }
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (role.isBuiltIn) {
      throw new ForbiddenException('内置角色不可删除');
    }
    if (role._count.members > 0) {
      throw new ConflictException('该角色下仍有成员，无法删除');
    }
    return this.prisma.role.delete({ where: { id: roleId } });
  }

  async assignMenus(input: { roleId: string; data: AssignRoleMenusInput }) {
    const role = await this.prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    await this.prisma.roleMenuItem.deleteMany({ where: { roleId: input.roleId } });
    if (input.data.menuIds.length > 0) {
      await this.prisma.roleMenuItem.createMany({
        data: input.data.menuIds.map((menuItemId) => ({ roleId: input.roleId, menuItemId }))
      });
    }
    return this.getById(input.roleId);
  }

  async getMenusForRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        menus: {
          include: {
            menuItem: {
              include: { children: { orderBy: { sortOrder: 'asc' } } }
            }
          }
        }
      }
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    return role.menus.map((rm) => rm.menuItem);
  }
}
