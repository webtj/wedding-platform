import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMaterialTypeDto, UpdateMaterialTypeDto } from '../material/dto';

@Injectable()
export class SuperMaterialTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId?: string, search?: string, page = 1, pageSize = 20) {
    const where: Record<string, unknown> = {};

    if (tenantId === '__platform__') {
      where.tenantId = null;
    } else if (tenantId) {
      where.tenantId = tenantId;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' as const };
    }

    const [items, total] = await Promise.all([
      this.prisma.materialType.findMany({
        where,
        include: {
          tenant: { select: { id: true, name: true } }
        },
        orderBy: [{ createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.materialType.count({ where })
    ]);

    return { items, total, page, pageSize };
  }

  create(data: CreateMaterialTypeDto) {
    return this.prisma.materialType.create({
      data: {
        name: data.name,
        code: data.code,
        icon: data.icon,
        defaultSize: data.defaultSize ?? undefined,
        sizes: data.sizes ?? undefined,
        tenantId: null
      }
    });
  }

  async update(id: string, data: UpdateMaterialTypeDto) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');

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

  async delete(id: string) {
    const existing = await this.prisma.materialType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('素材类型不存在');

    return this.prisma.materialType.delete({ where: { id } });
  }
}
