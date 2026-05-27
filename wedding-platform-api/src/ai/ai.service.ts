import { Injectable, NotFoundException } from '@nestjs/common';
import { AiJobStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAiJobDto } from './dto';
import { AiProvider } from './ai-provider';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: AiProvider,
    private readonly audit: AuditService
  ) {}

  listOutputs(input: { tenantId: string; projectId: string }) {
    return this.prisma.aiOutput.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createJob(input: { tenantId: string; userId: string; projectId: string; data: CreateAiJobDto }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const projectName = `${project.brideName} & ${project.groomName}`;
    const generated = this.provider.generate({
      type: input.data.type,
      prompt: input.data.prompt,
      projectName
    });

    const job = await this.prisma.aiJob.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        type: input.data.type,
        prompt: input.data.prompt,
        requestedByUserId: input.userId,
        status: AiJobStatus.succeeded,
        outputs: {
          create: {
            tenantId: input.tenantId,
            projectId: input.projectId,
            title: generated.title,
            content: generated.content
          }
        }
      },
      include: { outputs: true }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'ai.job.create',
      entity: 'ai_job',
      entityId: job.id,
      metadata: { projectId: input.projectId, type: input.data.type }
    });
    return job;
  }
}
