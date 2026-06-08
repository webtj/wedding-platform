import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, MessageRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DesignState } from './state/design-state.service';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, userId: string, projectId?: string, title?: string) {
    return this.prisma.aiConversation.create({
      data: {
        tenantId,
        userId,
        projectId: projectId || null,
        title: title || '新对话',
      },
    });
  }

  async findById(tenantId: string, id: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id, tenantId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async list(tenantId: string, projectId?: string) {
    const where: Prisma.AiConversationWhereInput = { tenantId };
    if (projectId) where.projectId = projectId;

    return this.prisma.aiConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async addMessage(
    conversationId: string,
    tenantId: string,
    role: MessageRole,
    content?: string,
    generationId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.aiConversationMessage.create({
      data: {
        conversationId,
        tenantId,
        role,
        content: content || null,
        generationId: generationId || null,
        metadata: metadata ?? Prisma.DbNull,
      },
    });
  }

  async updateDesignState(conversationId: string, tenantId: string, designState: DesignState) {
    return this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { currentDesignState: designState as unknown as Prisma.InputJsonValue },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.aiGeneration.deleteMany({
      where: { conversationId: id, tenantId },
    });
    await this.prisma.aiConversation.delete({
      where: { id },
    });
    return { success: true };
  }

  async updateCurrentGeneration(conversationId: string, tenantId: string, generationId: string) {
    return this.prisma.aiConversation.update({
      where: { id: conversationId },
      data: { currentGenerationId: generationId },
    });
  }
}
