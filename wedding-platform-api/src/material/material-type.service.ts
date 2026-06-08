import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMaterialTypeDto, UpdateMaterialTypeDto } from './dto';

@Injectable()
export class MaterialTypeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 租户列表：系统内置 + 本租户自定义
   * 平台管理员：只看系统内置
   */
  async list(tenantId: string | null, search?: string, page = 1, pageSize = 20) {
    const tenantFilter = tenantId ? [{ tenantId }] : [];
    const where = {
      OR: [
        { isSystem: true, tenantId: null },
        ...tenantFilter
      ],
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.materialType.findMany({
        where,
        orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.materialType.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  async getById(id: string) {
    const materialType = await this.prisma.materialType.findUnique({ where: { id } });
    if (!materialType) throw new NotFoundException('素材类型不存在');
    return materialType;
  }

  /**
   * 租户创建：isSystem=false, tenantId=当前租户
   */
  create(tenantId: string, data: CreateMaterialTypeDto) {
    return this.prisma.materialType.create({
      data: {
        name: data.name,
        code: data.code,
        icon: data.icon,
        defaultSize: data.defaultSize ?? undefined,
        sizes: data.sizes ?? undefined,
        isSystem: false,
        tenantId
      }
    });
  }

  /**
   * 租户更新：只能更新自己租户的（isSystem=false, tenantId=当前租户）
   */
  async update(id: string, tenantId: string, data: UpdateMaterialTypeDto) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');
    if (existing.isSystem) throw new BadRequestException('不能编辑系统内置素材类型');
    if (existing.tenantId !== tenantId) throw new BadRequestException('不能编辑其他租户的素材类型');

    return this.prisma.materialType.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.defaultSize !== undefined ? { defaultSize: data.defaultSize } : {}),
        ...(data.sizes !== undefined ? { sizes: data.sizes } : {})
      }
    });
  }

  /**
   * 租户删除：只能删除自己租户的（isSystem=false, tenantId=当前租户）
   */
  async delete(id: string, tenantId: string) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');
    if (existing.isSystem) throw new BadRequestException('不能删除系统内置素材类型');
    if (existing.tenantId !== tenantId) throw new BadRequestException('不能删除其他租户的素材类型');

    return this.prisma.materialType.delete({ where: { id } });
  }
}
