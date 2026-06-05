import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssignRoleMenusInput, CreateTenantRoleInput, UpdateTenantRoleInput } from '@wedding/shared';
import { BusinessException } from '../common/exceptions/business.exception';
import type { AuthContext } from '../common/auth/auth-context';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { auth: AuthContext; search?: string; page?: number; pageSize?: number }) {
    const tenantId = params.auth.tenantId;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };
    if (params.search) {
      where.name = { contains: params.search };
    }

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { tenant: { select: { name: true } } } }),
      this.prisma.role.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getById(auth: AuthContext, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId: auth.tenantId },
      include: { permissions: { include: { permission: true } }, menus: { include: { menuItem: true } }, tenant: { select: { name: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(auth: AuthContext, input: CreateTenantRoleInput) {
    const existing = await this.prisma.role.findFirst({ where: { tenantId: auth.tenantId, code: input.code } });
    if (existing) throw BusinessException.validationError('角色代码已存在');
    return this.prisma.role.create({ data: { ...input, scope: 'tenant', tenantId: auth.tenantId } });
  }

  async update(auth: AuthContext, roleId: string, input: UpdateTenantRoleInput) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId: auth.tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.role.update({ where: { id: roleId }, data: input });
  }

  async delete(auth: AuthContext, roleId: string) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId: auth.tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isBuiltIn) throw BusinessException.validationError('内置角色不可删除');
    return this.prisma.role.delete({ where: { id: roleId } });
  }

  async assignMenus(auth: AuthContext, roleId: string, data: AssignRoleMenusInput) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId: auth.tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.roleMenuItem.deleteMany({ where: { roleId } });
    const menuIds = data.menuIds ?? [];
    if (menuIds.length > 0) {
      await this.prisma.roleMenuItem.createMany({ data: menuIds.map((id: string) => ({ roleId, menuItemId: id })) });
    }
    return { success: true };
  }

  async getMenusForRole(auth: AuthContext, roleId: string) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId: auth.tenantId } });
    if (!role) throw new NotFoundException('Role not found');
    const menus = await this.prisma.menuItem.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    return menus;
  }
}
