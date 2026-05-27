import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateVendorInput, UpdateVendorInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(input: { tenantId: string }) {
    return this.prisma.vendorProfile.findMany({ where: { tenantId: input.tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  create(input: { tenantId: string; userId: string; data: CreateVendorInput }) {
    return this.prisma.vendorProfile.create({ data: { tenantId: input.tenantId, createdByUserId: input.userId, ...input.data } });
  }

  async update(input: { tenantId: string; vendorId: string; data: UpdateVendorInput }) {
    const existing = await this.prisma.vendorProfile.findFirst({ where: { id: input.vendorId, tenantId: input.tenantId } });
    if (!existing) { throw new NotFoundException('Vendor not found'); }
    return this.prisma.vendorProfile.update({ where: { id: input.vendorId }, data: input.data });
  }
}
