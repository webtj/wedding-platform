import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMaterialTypeDto, UpdateMaterialTypeDto } from '../material/dto';

@Injectable()
export class SuperMaterialTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 超级管理员列表：
   * - 系统内置类型（isSystem=true, tenantId=null）
   * - 所有租户类型（可选 tenantId 筛选）
   * - tenantId='__platform__' 时只返回系统内置
   */
  async list(tenantId?: string, search?: string, page = 1, pageSize = 20) {
    const where = {
      ...(tenantId === '__platform__'
        ? { isSystem: true }
        : tenantId
          ? { tenantId, isSystem: false }
          : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.materialType.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true } }
        },
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.materialType.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * 创建系统内置类型：isSystem=true, tenantId=null
   */
  create(data: CreateMaterialTypeDto) {
    return this.prisma.materialType.create({
      data: {
        name: data.name,
        code: data.code,
        icon: data.icon,
        defaultSize: data.defaultSize ?? undefined,
        sizes: data.sizes ?? undefined,
        isSystem: true,
        tenantId: null
      }
    });
  }

  /**
   * 更新系统内置类型：只能更新 isSystem=true 的
   */
  async update(id: string, data: UpdateMaterialTypeDto) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');
    if (!existing.isSystem) throw new BadRequestException('只能编辑系统内置素材类型');

    return this.prisma.materialType.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.defaultSize !== undefined ? { defaultSize: data.defaultSize } : {}),
        ...(data.sizes !== undefined ? { sizes: data.sizes } : {})
      }
    });
  }

  /**
   * 删除系统内置类型：只能删除 isSystem=true 的
   */
  async delete(id: string) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');
    if (!existing.isSystem) throw new BadRequestException('只能删除系统内置素材类型');

    return this.prisma.materialType.delete({ where: { id } });
  }
}
