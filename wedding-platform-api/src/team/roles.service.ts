import { Injectable } from '@nestjs/common';
import { RoleScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: { tenantId: string; search?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = {
      OR: [{ tenantId: input.tenantId, scope: RoleScope.tenant }, { tenantId: null, scope: RoleScope.platform }]
    };
    if (input.search) {
      where.AND = [{ OR: where.OR as any[] }, { OR: [{ name: { contains: input.search } }, { code: { contains: input.search } }, { description: { contains: input.search } }] }];
      delete where.OR;
    }
    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: { permissions: { include: { permission: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize
      }),
      this.prisma.role.count({ where })
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
