import { Injectable, NotFoundException } from '@nestjs/common';
import type { PromptCategoryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
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

  async listCategories(tenantId: string, type?: string) {
    return this.prisma.quickPromptCategory.findMany({
      where: {
        OR: [{ tenantId: null }, { tenantId }],
        ...(type ? { type: type as PromptCategoryType } : {})
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        prompts: {
          where: {
            OR: [{ tenantId: null }, { tenantId }]
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
  }

  async createCategory(tenantId: string, data: CreateQuickPromptCategoryDto) {
    return this.prisma.quickPromptCategory.create({
      data: { tenantId, ...data }
    });
  }

  async updateCategory(tenantId: string, categoryId: string, data: UpdateQuickPromptCategoryDto) {
    const cat = await this.prisma.quickPromptCategory.findFirst({
      where: { id: categoryId, tenantId }
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (!cat.tenantId) throw AppError.forbidden('内置分类不可编辑');

    return this.prisma.quickPromptCategory.update({
      where: { id: categoryId },
      data
    });
  }

  async deleteCategory(tenantId: string, categoryId: string) {
    const cat = await this.prisma.quickPromptCategory.findFirst({
      where: { id: categoryId, tenantId }
    });
    if (!cat) throw new NotFoundException('Category not found');
    if (!cat.tenantId) throw AppError.forbidden('内置分类不可删除');

    await this.prisma.quickPromptCategory.delete({ where: { id: categoryId } });
    return { deleted: true };
  }

  // ── Prompts ─────────────────────────────────────────────────────────────

  async createPrompt(tenantId: string, data: CreateQuickPromptDto) {
    const cat = await this.prisma.quickPromptCategory.findFirst({
      where: { id: data.categoryId }
    });
    if (!cat) throw new NotFoundException('Category not found');

    return this.prisma.quickPrompt.create({
      data: { tenantId, ...data }
    });
  }

  async updatePrompt(tenantId: string, promptId: string, data: UpdateQuickPromptDto) {
    const prompt = await this.prisma.quickPrompt.findFirst({
      where: { id: promptId }
    });
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (!prompt.tenantId) throw AppError.forbidden('内置推荐词不可编辑');
    if (prompt.tenantId !== tenantId) throw AppError.forbidden('无权修改此推荐词');

    return this.prisma.quickPrompt.update({
      where: { id: promptId },
      data
    });
  }

  async deletePrompt(tenantId: string, promptId: string) {
    const prompt = await this.prisma.quickPrompt.findFirst({
      where: { id: promptId }
    });
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (!prompt.tenantId) throw AppError.forbidden('内置推荐词不可删除');
    if (prompt.tenantId !== tenantId) throw AppError.forbidden('无权删除此推荐词');

    await this.prisma.quickPrompt.delete({ where: { id: promptId } });
    return { deleted: true };
  }
}
