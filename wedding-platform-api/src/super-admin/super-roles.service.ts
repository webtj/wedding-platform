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

    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
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
    const where: Record<string, unknown> = { id: roleId };
    if (auth.tenantId) where.tenantId = auth.tenantId;
    const role = await this.prisma.role.findFirst({
      where,
      include: { menus: { include: { menuItem: true } }, tenant: { select: { name: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(auth: AuthContext, input: CreateTenantRoleInput) {
    const tenantId = input.tenantId ?? auth.tenantId;
    if (!tenantId) throw BusinessException.validationError('必须指定租户');
    const existing = await this.prisma.role.findFirst({ where: { tenantId, code: input.code } });
    if (existing) throw BusinessException.validationError('角色代码已存在');
    return this.prisma.role.create({
      data: { ...input, scope: 'tenant', tenantId, isBuiltIn: true }
    });
  }

  async update(auth: AuthContext, roleId: string, input: UpdateTenantRoleInput) {
    const where: Record<string, unknown> = { id: roleId };
    if (auth.tenantId) where.tenantId = auth.tenantId;
    const role = await this.prisma.role.findFirst({ where });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.role.update({ where: { id: roleId }, data: input });
  }

  async delete(auth: AuthContext, roleId: string) {
    const where: Record<string, unknown> = { id: roleId };
    if (auth.tenantId) where.tenantId = auth.tenantId;
    const role = await this.prisma.role.findFirst({ where });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isBuiltIn) throw BusinessException.validationError('内置角色不可删除');
    return this.prisma.role.delete({ where: { id: roleId } });
  }

  async assignMenus(auth: AuthContext, roleId: string, data: AssignRoleMenusInput) {
    const where: Record<string, unknown> = { id: roleId };
    if (auth.tenantId) where.tenantId = auth.tenantId;
    const role = await this.prisma.role.findFirst({ where });
    if (!role) throw new NotFoundException('Role not found');
    await this.prisma.roleMenuItem.deleteMany({ where: { roleId } });
    const menuIds = data.menuIds ?? [];
    if (menuIds.length > 0) {
      await this.prisma.roleMenuItem.createMany({ data: menuIds.map((id: string) => ({ roleId, menuItemId: id })) });
    }
    // Recompute role.permissionCodes as the union of selected menus' permissionCodes.
    // Empty selection = explicit empty (no permissions). This makes the menu editor
    // the single source of truth for what the role can do at the API level.
    const selectedMenus =
      menuIds.length > 0
        ? await this.prisma.menuItem.findMany({
            where: { id: { in: menuIds } },
            select: { permissionCodes: true }
          })
        : [];
    const union = new Set<string>();
    for (const m of selectedMenus) {
      for (const code of m.permissionCodes) union.add(code);
    }
    await this.prisma.role.update({
      where: { id: roleId },
      data: { permissionCodes: Array.from(union) }
    });
    return { success: true };
  }

  /**
   * All menus that *could* be assigned to a role in the given tenant.
   * Returns the full menu tree (parents with children, sorted by sortOrder),
   * independent of the role. The role editor's left-pane checklist calls this.
   */
  async getAvailableMenusForRole(auth: AuthContext) {
    const menuWhere: Record<string, unknown> = { parentId: null };
    if (auth.tenantId) menuWhere.tenantId = auth.tenantId;
    return this.prisma.menuItem.findMany({
      where: menuWhere,
      include: { children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });
  }

  /**
   * Menu IDs currently assigned to the given role. The role editor's
   * right-pane "已选" list calls this. Returns just IDs (the editor joins
   * them against the available set on the client).
   */
  async getAssignedMenuIdsForRole(auth: AuthContext, roleId: string) {
    const where: Record<string, unknown> = { id: roleId };
    if (auth.tenantId) where.tenantId = auth.tenantId;
    const role = await this.prisma.role.findFirst({
      where,
      select: { id: true }
    });
    if (!role) throw new NotFoundException('Role not found');
    const assignments = await this.prisma.roleMenuItem.findMany({
      where: { roleId },
      select: { menuItemId: true }
    });
    return assignments.map((a) => a.menuItemId);
  }
}
