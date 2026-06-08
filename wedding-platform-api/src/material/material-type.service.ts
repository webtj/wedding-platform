import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantContext } from '../common/tenant-context';
import type { CreateMaterialTypeDto, UpdateMaterialTypeDto } from './dto';

@Injectable()
export class MaterialTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ctx: TenantContext, search?: string, page = 1, pageSize = 20) {
    const where: Record<string, unknown> = {};

    if (!ctx.isPlatformAdmin) {
      where.OR = [
        { tenantId: null },
        { tenantId: ctx.tenantId }
      ];
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const [items, total] = await Promise.all([
      this.prisma.materialType.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
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

  create(ctx: TenantContext, data: CreateMaterialTypeDto) {
    return this.prisma.materialType.create({
      data: {
        name: data.name,
        code: data.code,
        icon: data.icon,
        defaultSize: data.defaultSize ?? undefined,
        sizes: data.sizes ?? undefined,
        tenantId: ctx.tenantId
      }
    });
  }

  async update(id: string, ctx: TenantContext, data: UpdateMaterialTypeDto) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');

    if (!ctx.isPlatformAdmin) {
      if (existing.tenantId === null) throw new BadRequestException('不能编辑系统内置素材类型');
      if (existing.tenantId !== ctx.tenantId) throw new BadRequestException('不能编辑其他租户的素材类型');
    }

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

  async delete(id: string, ctx: TenantContext) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');

    if (!ctx.isPlatformAdmin) {
      if (existing.tenantId === null) throw new BadRequestException('不能删除系统内置素材类型');
      if (existing.tenantId !== ctx.tenantId) throw new BadRequestException('不能删除其他租户的素材类型');
    }

    return this.prisma.materialType.delete({ where: { id } });
  }
}
