import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';

describe('ConversationService', () => {
  describe('create', () => {
    it('creates a conversation with defaults when title and projectId omitted', async () => {
      const prisma = { aiConversation: { create: vi.fn().mockResolvedValue({ id: 'c1' }) } };
      const service = new ConversationService(prisma as never);
      await service.create('t1', 'u1');
      expect(prisma.aiConversation.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', userId: 'u1', projectId: null, title: '新对话' }
      });
    });

    it('uses provided title and projectId', async () => {
      const prisma = { aiConversation: { create: vi.fn().mockResolvedValue({ id: 'c1' }) } };
      const service = new ConversationService(prisma as never);
      await service.create('t1', 'u1', 'p1', '自定义标题');
      expect(prisma.aiConversation.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', userId: 'u1', projectId: 'p1', title: '自定义标题' }
      });
    });
  });

  describe('findById', () => {
    it('returns conversation with messages ordered by createdAt', async () => {
      const conv = { id: 'c1', messages: [] };
      const prisma = { aiConversation: { findFirst: vi.fn().mockResolvedValue(conv) } };
      const service = new ConversationService(prisma as never);
      expect(await service.findById('t1', 'c1')).toEqual(conv);
    });

    it('throws NotFound when missing', async () => {
      const prisma = { aiConversation: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ConversationService(prisma as never);
      await expect(service.findById('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('lists conversations with optional projectId filter', async () => {
      const prisma = { aiConversation: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new ConversationService(prisma as never);
      await service.list('t1', 'p1');
      expect(prisma.aiConversation.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', projectId: 'p1' },
        orderBy: { updatedAt: 'desc' },
        take: 50
      });
    });

    it('lists all tenant conversations when no projectId', async () => {
      const prisma = { aiConversation: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new ConversationService(prisma as never);
      await service.list('t1');
      expect(prisma.aiConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1' } })
      );
    });
  });

  describe('addMessage', () => {
    it('creates a message with all fields', async () => {
      const prisma = { aiConversationMessage: { create: vi.fn().mockResolvedValue({ id: 'm1' }) } };
      const service = new ConversationService(prisma as never);
      await service.addMessage('c1', 't1', 'user' as never, '你好', 'g1', { foo: 'bar' } as never);
      expect(prisma.aiConversationMessage.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'c1', tenantId: 't1', role: 'user',
          content: '你好', generationId: 'g1', metadata: { foo: 'bar' }
        }
      });
    });

    it('defaults content and generationId to null when omitted', async () => {
      const prisma = { aiConversationMessage: { create: vi.fn().mockResolvedValue({ id: 'm1' }) } };
      const service = new ConversationService(prisma as never);
      await service.addMessage('c1', 't1', 'assistant' as never);
      expect(prisma.aiConversationMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ content: null, generationId: null })
      });
    });
  });

  describe('updateDesignState', () => {
    it('updates currentDesignState on the conversation', async () => {
      const prisma = { aiConversation: { update: vi.fn().mockResolvedValue({}) } };
      const service = new ConversationService(prisma as never);
      const state = { version: 1, currentStyle: ['romantic'] };
      await service.updateDesignState('c1', 't1', state as never);
      expect(prisma.aiConversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { currentDesignState: state }
      });
    });
  });

  describe('updateCurrentGeneration', () => {
    it('updates currentGenerationId on the conversation', async () => {
      const prisma = { aiConversation: { update: vi.fn().mockResolvedValue({}) } };
      const service = new ConversationService(prisma as never);
      await service.updateCurrentGeneration('c1', 't1', 'g1');
      expect(prisma.aiConversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { currentGenerationId: 'g1' }
      });
    });
  });
});
