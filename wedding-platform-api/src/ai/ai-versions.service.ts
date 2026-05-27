import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateAiOutputVersionInput, RefineAiOutputInput } from '@wedding/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvider } from './ai-provider';

@Injectable()
export class AiVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AiProvider,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; outputId: string }) {
    return this.prisma.aiOutputVersion.findMany({
      where: {
        outputId: input.outputId,
        output: { tenantId: input.tenantId }
      },
      orderBy: { version: 'desc' }
    });
  }

  async createVersion(input: { tenantId: string; userId: string; outputId: string; data: CreateAiOutputVersionInput }) {
    const output = await this.prisma.aiOutput.findFirst({ where: { id: input.outputId, tenantId: input.tenantId } });
    if (!output) {
      throw new NotFoundException('AI output not found');
    }
    const latest = await this.prisma.aiOutputVersion.findFirst({
      where: { outputId: input.outputId },
      orderBy: { version: 'desc' }
    });
    const version = (latest?.version ?? 0) + 1;
    const created = await this.prisma.aiOutputVersion.create({
      data: {
        outputId: input.outputId,
        version,
        title: input.data.title,
        content: input.data.content,
        note: input.data.note
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'ai_output.version.create',
      entity: 'ai_output',
      entityId: input.outputId,
      metadata: { projectId: output.projectId, version }
    });
    return created;
  }

  async refine(input: { tenantId: string; userId: string; outputId: string; data: RefineAiOutputInput }) {
    const output = await this.prisma.aiOutput.findFirst({ where: { id: input.outputId, tenantId: input.tenantId } });
    if (!output) {
      throw new NotFoundException('AI output not found');
    }
    const refined = this.provider.refine({
      originalTitle: output.title,
      originalContent: output.content,
      instruction: input.data.instruction
    });
    if (!input.data.saveAsVersion) {
      return refined;
    }
    return this.createVersion({
      tenantId: input.tenantId,
      userId: input.userId,
      outputId: input.outputId,
      data: {
        title: refined.title,
        content: refined.content,
        note: input.data.instruction
      }
    });
  }
}
