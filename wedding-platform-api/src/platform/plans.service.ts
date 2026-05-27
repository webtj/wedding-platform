import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePlanPackageInput, UpdatePlanPackageInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.planPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
  }

  create(data: CreatePlanPackageInput) {
    return this.prisma.planPackage.create({ data });
  }

  async update(planId: string, data: UpdatePlanPackageInput) {
    const existing = await this.prisma.planPackage.findUnique({ where: { id: planId } });
    if (!existing) {
      throw new NotFoundException('Plan package not found');
    }
    return this.prisma.planPackage.update({ where: { id: planId }, data });
  }
}
