import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePublicCaseInput, UpdatePublicCaseInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicCasesService {
  constructor(private readonly prisma: PrismaService) {}

  list(input: { tenantId: string }) {
    return this.prisma.publicCase.findMany({ where: { tenantId: input.tenantId }, include: { project: true, vendor: true }, orderBy: { updatedAt: 'desc' } });
  }

  async createFromProject(input: { tenantId: string; userId: string; projectId: string; data: CreatePublicCaseInput }) {
    const project = await this.prisma.project.findFirst({ where: { id: input.projectId, tenantId: input.tenantId } });
    if (!project) { throw new NotFoundException('Project not found'); }
    return this.prisma.publicCase.create({ data: { tenantId: input.tenantId, projectId: input.projectId, createdByUserId: input.userId, publishedAt: input.data.status === 'published' ? new Date() : null, ...input.data } });
  }

  async update(input: { tenantId: string; caseId: string; data: UpdatePublicCaseInput }) {
    const existing = await this.prisma.publicCase.findFirst({ where: { id: input.caseId, tenantId: input.tenantId } });
    if (!existing) { throw new NotFoundException('Public case not found'); }
    return this.prisma.publicCase.update({ where: { id: input.caseId }, data: { ...input.data, publishedAt: input.data.status === 'published' && !existing.publishedAt ? new Date() : existing.publishedAt } });
  }
}
