import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MiniProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(input: { tenantId: string; userId: string }) {
    return this.prisma.project.findMany({
      where: { tenantId: input.tenantId, members: { some: { userId: input.userId } } },
      select: { id: true, brideName: true, groomName: true, weddingDate: true, venue: true, status: true },
      orderBy: { weddingDate: 'desc' }
    });
  }

  async summary(input: { tenantId: string; userId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId, members: { some: { userId: input.userId } } },
      include: { tasks: { orderBy: { dueDate: 'asc' }, take: 8 }, timelineItems: { orderBy: { startTime: 'asc' }, take: 8 }, assets: { where: { status: 'ready' }, orderBy: { createdAt: 'desc' }, take: 8 } }
    });
    if (!project) { throw new NotFoundException('Project not found'); }
    return project;
  }
}
