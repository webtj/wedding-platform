import { Injectable, NotFoundException } from '@nestjs/common';
import type { PromptCategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { TenantContext } from '../common/tenant-context';
import type {
  CreateQuickPromptCategoryDto,
  UpdateQuickPromptCategoryDto,
  CreateQuickPromptDto,
  UpdateQuickPromptDto
} from './dto';

@Injectable()
export class QuickPromptsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Categories ──────────────────────────────────────────────────────────

  async listCategories(ctx: TenantContext, type?: string) {
    const where = ctx.isPlatformAdmin
      ? { ...(type ? { type: type as PromptCategoryType } : {}) }
      : {
          OR: [{ tenantId: null }, { tenantId: ctx.tenantId }],
          ...(type ? { type: type as PromptCategoryType } : {})
        };
    const promptWhere = ctx.isPlatformAdmin
      ? {}
      : { OR: [{ tenantId: null }, { tenantId: ctx.tenantId }] };
    return this.prisma.quickPromptCategory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        prompts: {
          where: promptWhere,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async createCategory(ctx: TenantContext, data: CreateQuickPromptCategoryDto) {
    return this.prisma.quickPromptCategory.create({
      data: { tenantId: ctx.tenantId, ...data }
    });
  }

  async updateCategory(ctx: TenantContext, categoryId: string, data: UpdateQuickPromptCategoryDto) {
    const cat = await this.prisma.quickPromptCategory.findFirst({
      where: { id: categoryId }
    });
    if (!cat) throw new NotFoundException('Category not found');

    if (!ctx.isPlatformAdmin) {
      if (cat.tenantId === null) throw AppError.forbidden('内置分类不可编辑');
      if (cat.tenantId !== ctx.tenantId) throw AppError.forbidden('无权修改此分类');
    }

    return this.prisma.quickPromptCategory.update({
      where: { id: categoryId },
      data
    });
  }

  async deleteCategory(ctx: TenantContext, categoryId: string) {
    const cat = await this.prisma.quickPromptCategory.findFirst({
      where: { id: categoryId }
    });
    if (!cat) throw new NotFoundException('Category not found');

    if (!ctx.isPlatformAdmin) {
      if (cat.tenantId === null) throw AppError.forbidden('内置分类不可删除');
      if (cat.tenantId !== ctx.tenantId) throw AppError.forbidden('无权删除此分类');
    }

    await this.prisma.quickPromptCategory.delete({ where: { id: categoryId } });
    return { deleted: true };
  }

  // ── Prompts ─────────────────────────────────────────────────────────────

  async createPrompt(ctx: TenantContext, data: CreateQuickPromptDto) {
    const cat = await this.prisma.quickPromptCategory.findFirst({
      where: { id: data.categoryId }
    });
    if (!cat) throw new NotFoundException('Category not found');

    if (!ctx.isPlatformAdmin) {
      if (cat.tenantId !== null && cat.tenantId !== ctx.tenantId) {
        throw AppError.forbidden('无权在该分类下创建推荐词');
      }
    }

    return this.prisma.quickPrompt.create({
      data: { tenantId: ctx.tenantId, ...data }
    });
  }

  async updatePrompt(ctx: TenantContext, promptId: string, data: UpdateQuickPromptDto) {
    const prompt = await this.prisma.quickPrompt.findFirst({
      where: { id: promptId }
    });
    if (!prompt) throw new NotFoundException('Prompt not found');

    if (!ctx.isPlatformAdmin) {
      if (prompt.tenantId === null) throw AppError.forbidden('内置推荐词不可编辑');
      if (prompt.tenantId !== ctx.tenantId) throw AppError.forbidden('无权修改此推荐词');
    }

    return this.prisma.quickPrompt.update({
      where: { id: promptId },
      data
    });
  }

  async deletePrompt(ctx: TenantContext, promptId: string) {
    const prompt = await this.prisma.quickPrompt.findFirst({
      where: { id: promptId }
    });
    if (!prompt) throw new NotFoundException('Prompt not found');

    if (!ctx.isPlatformAdmin) {
      if (prompt.tenantId === null) throw AppError.forbidden('内置推荐词不可删除');
      if (prompt.tenantId !== ctx.tenantId) throw AppError.forbidden('无权删除此推荐词');
    }

    await this.prisma.quickPrompt.delete({ where: { id: promptId } });
    return { deleted: true };
  }
}
