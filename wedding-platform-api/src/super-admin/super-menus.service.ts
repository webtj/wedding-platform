import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMenuItemInput, UpdateMenuItemInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperMenusService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.menuItem.findMany({
      where: { parentId: null },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    });
  }

  listAll() {
    return this.prisma.menuItem.findMany({
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }]
    });
  }

  async create(data: CreateMenuItemInput) {
    if (data.parentId) {
      const parent = await this.prisma.menuItem.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new NotFoundException('父级菜单不存在');
      }
    }
    // If a parentId is given, inherit scope and tenantId from parent
    const parent = data.parentId
      ? await this.prisma.menuItem.findUnique({ where: { id: data.parentId } })
      : null;
    return this.prisma.menuItem.create({
      data: {
        scope: parent?.scope ?? 'tenant',
        tenantId: parent?.tenantId ?? null,
        parentId: data.parentId ?? null,
        label: data.label,
        href: data.href ?? null,
        icon: data.icon ?? null,
        sortOrder: data.sortOrder ?? 0,
        visible: data.visible ?? true,
        permissionCodes: data.permissionCodes ?? []
      }
    });
  }

  async update(input: { menuItemId: string; data: UpdateMenuItemInput }) {
    const item = await this.prisma.menuItem.findUnique({ where: { id: input.menuItemId } });
    if (!item) {
      throw new NotFoundException('菜单项不存在');
    }
    if (input.data.parentId && input.data.parentId !== input.menuItemId) {
      const parent = await this.prisma.menuItem.findUnique({ where: { id: input.data.parentId } });
      if (!parent) {
        throw new NotFoundException('父级菜单不存在');
      }
    }
    const { permissionCodes, ...rest } = input.data;
    return this.prisma.menuItem.update({
      where: { id: input.menuItemId },
      data: {
        ...rest,
        ...(permissionCodes !== undefined ? { permissionCodes } : {})
      }
    });
  }

  async delete(menuItemId: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { children: true }
    });
    if (!item) {
      throw new NotFoundException('菜单项不存在');
    }
    if (item.children.length > 0) {
      throw new ConflictException('请先删除子菜单');
    }
    return this.prisma.menuItem.delete({ where: { id: menuItemId } });
  }

  async reorder(input: { items: { id: string; sortOrder: number }[] }) {
    await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.menuItem.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder }
        })
      )
    );
    return this.listAll();
  }
}
