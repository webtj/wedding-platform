import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  listMembers(input: { tenantId: string }) {
    return this.prisma.tenantMember.findMany({
      where: { tenantId: input.tenantId },
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }
}
