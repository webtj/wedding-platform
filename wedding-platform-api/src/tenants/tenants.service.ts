import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTenantDto } from './dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(input: { userId: string }) {
    return this.prisma.tenant.findMany({
      where: {
        members: {
          some: {
            userId: input.userId,
            status: 'active'
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  create(input: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: {
        name: input.name,
      }
    });
  }
}
