import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type AiTextGeneration } from '@prisma/client';
import { BusinessException } from '../../common/exceptions/business.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { QuotaService } from '../quota.service';
import {
  TEXT_GENERATION_PROMPTS,
  type TextGenerationType,
  type AiTextGenerateDto,
  type AiTextRefineDto,
  type AiTextGenerationQueryDto,
} from './text-generation.dto';

@Injectable()
export class TextGenerationService {
  private readonly logger = new Logger(TextGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly quotaService: QuotaService,
  ) {}

  async generate(tenantId: string, userId: string, data: AiTextGenerateDto): Promise<AiTextGeneration> {
    await this.quotaService.checkQuota(tenantId, userId);

    const promptConfig = TEXT_GENERATION_PROMPTS[data.type];
    if (!promptConfig) {
      throw new BusinessException('AI_INVALID_TEXT_TYPE', `不支持的文本类型: ${data.type}`, 400);
    }

    // Build the user prompt with style hints
    let fullPrompt = data.prompt;
    if (data.style) {
      fullPrompt = `风格要求: ${data.style}\n\n${fullPrompt}`;
    }
    if (data.language && data.language !== 'zh') {
      fullPrompt = `请使用${data.language === 'en' ? '英文' : data.language}撰写。\n\n${fullPrompt}`;
    }

    let result: string;
    try {
      result = await this.llmService.chat(fullPrompt, promptConfig.system);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Text generation failed: ${msg.slice(0, 200)}`);
      throw new BusinessException('AI_GENERATION_FAILED', '文本生成失败，请稍后重试', 500);
    }

    const generation = await this.prisma.aiTextGeneration.create({
      data: {
        tenantId,
        userId,
        projectId: data.projectId ?? null,
        type: data.type,
        prompt: data.prompt,
        result,
        style: data.style ?? null,
        language: data.language,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });

    await this.quotaService.recordUsage(tenantId, userId, 'text_generate', {
      textGenerationId: generation.id,
      type: data.type,
    });

    return generation;
  }

  async refine(
    tenantId: string,
    userId: string,
    id: string,
    data: AiTextRefineDto,
  ): Promise<AiTextGeneration> {
    await this.quotaService.checkQuota(tenantId, userId);

    const original = await this.prisma.aiTextGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!original) {
      throw new BusinessException('RESOURCE_NOT_FOUND', `文本生成记录 ${id} 不存在`, 404);
    }

    const promptConfig = TEXT_GENERATION_PROMPTS[original.type as TextGenerationType];
    if (!promptConfig) {
      throw new BusinessException('AI_INVALID_TEXT_TYPE', `不支持的文本类型: ${original.type}`, 400);
    }

    const refinePrompt = [
      '请根据以下反馈优化之前生成的文本。',
      '',
      '--- 原始需求 ---',
      original.prompt,
      '',
      '--- 之前生成的内容 ---',
      original.result,
      '',
      '--- 优化反馈 ---',
      data.feedback,
      '',
      '请根据反馈重新生成优化后的完整文本。',
    ].join('\n');

    let result: string;
    try {
      const systemPrompt = data.style
        ? `${promptConfig.system}\n\n风格要求: ${data.style}`
        : promptConfig.system;
      result = await this.llmService.chat(refinePrompt, systemPrompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Text refinement failed: ${msg.slice(0, 200)}`);
      throw new BusinessException('AI_GENERATION_FAILED', '文本优化失败，请稍后重试', 500);
    }

    const refined = await this.prisma.aiTextGeneration.create({
      data: {
        tenantId,
        userId,
        projectId: original.projectId,
        type: original.type,
        prompt: data.feedback,
        result,
        style: data.style ?? original.style,
        language: original.language,
        metadata: {
          refinedFrom: original.id,
          originalPrompt: original.prompt,
        } as Prisma.InputJsonValue,
      },
    });

    await this.quotaService.recordUsage(tenantId, userId, 'text_refine', {
      textGenerationId: refined.id,
      originalId: original.id,
    });

    return refined;
  }

  async list(tenantId: string, query: AiTextGenerationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.AiTextGenerationWhereInput = { tenantId };
    if (query.type) where.type = query.type;
    if (query.projectId) where.projectId = query.projectId;
    if (typeof query.isBookmarked === 'boolean') where.isBookmarked = query.isBookmarked;

    const [items, total] = await Promise.all([
      this.prisma.aiTextGeneration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
      this.prisma.aiTextGeneration.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async getById(tenantId: string, id: string): Promise<AiTextGeneration> {
    const generation = await this.prisma.aiTextGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!generation) {
      throw new BusinessException('RESOURCE_NOT_FOUND', `文本生成记录 ${id} 不存在`, 404);
    }
    return generation;
  }

  async updateBookmark(
    tenantId: string,
    id: string,
    isBookmarked: boolean,
  ): Promise<AiTextGeneration> {
    const generation = await this.prisma.aiTextGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!generation) {
      throw new BusinessException('RESOURCE_NOT_FOUND', `文本生成记录 ${id} 不存在`, 404);
    }

    return this.prisma.aiTextGeneration.update({
      where: { id },
      data: { isBookmarked },
    });
  }

  async delete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    const generation = await this.prisma.aiTextGeneration.findFirst({
      where: { id, tenantId },
    });
    if (!generation) {
      throw new BusinessException('RESOURCE_NOT_FOUND', `文本生成记录 ${id} 不存在`, 404);
    }

    await this.prisma.aiTextGeneration.delete({ where: { id } });
    return { deleted: true };
  }
}
