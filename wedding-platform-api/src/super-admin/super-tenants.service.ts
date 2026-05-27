import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTenantAdminInput, UpdateTenantAdminInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperTenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, pageSize = 10, search?: string, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        include: { _count: { select: { members: true, projects: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: pageSize
      }),
      this.prisma.tenant.count({ where })
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { members: true, projects: true } } }
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async create(data: CreateTenantAdminInput) {
    return this.prisma.tenant.create({
      data: { name: data.name, description: data.description ?? '' }
    });
  }

  async update(input: { tenantId: string; data: UpdateTenantAdminInput }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.update({ where: { id: input.tenantId }, data: input.data });
  }

  async delete(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.prisma.tenant.delete({ where: { id: tenantId } });
  }
}
