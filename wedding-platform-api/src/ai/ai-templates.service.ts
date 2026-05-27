import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(input: { tenantId: string }) {
    return this.prisma.aiTemplate.findMany({
      where: {
        OR: [{ tenantId: null }, { tenantId: input.tenantId }]
      },
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }]
    });
  }
}
