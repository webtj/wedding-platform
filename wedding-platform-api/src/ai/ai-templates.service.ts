import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AiTemplateCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateAiTemplateInput {
  tenantId: string;
  data: {
    code: string;
    name: string;
    category: AiTemplateCategory;
    prompt: string;
  };
}

interface UpdateAiTemplateInput {
  tenantId: string;
  templateId: string;
  data: {
    name?: string;
    category?: AiTemplateCategory;
    prompt?: string;
  };
}

@Injectable()
export class AiTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(input: { tenantId: string; category?: AiTemplateCategory }) {
    return this.prisma.aiTemplate.findMany({
      where: {
        OR: [{ tenantId: null }, { tenantId: input.tenantId }],
        ...(input.category ? { category: input.category } : {})
      },
      orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }]
    });
  }

  async create(input: CreateAiTemplateInput) {
    const existing = await this.prisma.aiTemplate.findFirst({
      where: { tenantId: input.tenantId, code: input.data.code }
    });

    if (existing) {
      throw new BadRequestException('AI template code already exists');
    }

    return this.prisma.aiTemplate.create({
      data: {
        tenantId: input.tenantId,
        code: input.data.code,
        name: input.data.name,
        category: input.data.category,
        prompt: input.data.prompt,
        isBuiltIn: false
      }
    });
  }

  async update(input: UpdateAiTemplateInput) {
    const existing = await this.prisma.aiTemplate.findUnique({
      where: { id: input.templateId }
    });

    if (!existing) throw new NotFoundException('AI template not found');
    if (existing.isBuiltIn || existing.tenantId === null) {
      throw new BadRequestException('Built-in AI templates cannot be edited');
    }
    if (existing.tenantId !== input.tenantId) {
      throw new BadRequestException('Cannot edit another tenant template');
    }

    return this.prisma.aiTemplate.update({
      where: { id: input.templateId },
      data: input.data
    });
  }

  async delete(input: { tenantId: string; templateId: string }) {
    const existing = await this.prisma.aiTemplate.findUnique({
      where: { id: input.templateId }
    });

    if (!existing) throw new NotFoundException('AI template not found');
    if (existing.isBuiltIn || existing.tenantId === null) {
      throw new BadRequestException('Built-in AI templates cannot be deleted');
    }
    if (existing.tenantId !== input.tenantId) {
      throw new BadRequestException('Cannot delete another tenant template');
    }

    await this.prisma.aiTemplate.delete({ where: { id: input.templateId } });
    return { deleted: true };
  }
}
