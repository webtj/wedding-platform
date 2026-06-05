import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AiGenerationJobStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateJobData {
  generationId: string;
  tenantId: string;
  provider?: string;
  model?: string;
}

export interface JobStatus {
  id: string;
  generationId: string;
  status: string;
  progress: number;
  provider: string | null;
  model: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class GenerationJobService {
  private readonly logger = new Logger(GenerationJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJobData): Promise<JobStatus> {
    const job = await this.prisma.aiGenerationJob.create({
      data: {
        generationId: data.generationId,
        tenantId: data.tenantId,
        status: AiGenerationJobStatus.queued,
        progress: 0,
        provider: data.provider || null,
        model: data.model || null,
      },
    });
    return job as JobStatus;
  }

  async start(id: string, tenantId: string): Promise<void> {
    await this.prisma.aiGenerationJob.updateMany({
      where: { id, tenantId },
      data: { status: AiGenerationJobStatus.processing, startedAt: new Date() },
    });
  }

  async updateProgress(id: string, tenantId: string, progress: number): Promise<void> {
    await this.prisma.aiGenerationJob.updateMany({
      where: { id, tenantId },
      data: { progress },
    });
  }

  async complete(id: string, tenantId: string): Promise<void> {
    await this.prisma.aiGenerationJob.updateMany({
      where: { id, tenantId },
      data: { status: AiGenerationJobStatus.completed, progress: 100, completedAt: new Date() },
    });
  }

  async fail(id: string, tenantId: string, errorMessage: string): Promise<void> {
    await this.prisma.aiGenerationJob.updateMany({
      where: { id, tenantId },
      data: { status: AiGenerationJobStatus.failed, errorMessage, completedAt: new Date() },
    });
  }

  async findById(id: string, tenantId: string): Promise<JobStatus> {
    const job = await this.prisma.aiGenerationJob.findFirst({
      where: { id, tenantId },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job as JobStatus;
  }

  async findByGenerationId(generationId: string, tenantId: string): Promise<JobStatus | null> {
    const job = await this.prisma.aiGenerationJob.findFirst({
      where: { generationId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return job as JobStatus | null;
  }

  async list(tenantId: string, status?: string): Promise<JobStatus[]> {
    const where: any = { tenantId };
    if (status) where.status = status;

    const jobs = await this.prisma.aiGenerationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return jobs as JobStatus[];
  }
}
