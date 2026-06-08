import { describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../../common/exceptions/business.exception';
import { TextGenerationService } from './text-generation.service';

const buildQuota = () => ({
  checkQuota: vi.fn().mockResolvedValue(undefined),
  recordUsage: vi.fn().mockResolvedValue(undefined)
});

const buildLlm = () => ({
  chat: vi.fn().mockResolvedValue('生成的文本内容')
});

describe('TextGenerationService', () => {
  describe('generate', () => {
    it('checks quota, calls LLM, creates record, and records usage', async () => {
      const prisma = { aiTextGeneration: { create: vi.fn().mockResolvedValue({ id: 'tg1' }) } };
      const quota = buildQuota();
      const llm = buildLlm();
      const service = new TextGenerationService(prisma as never, llm as never, quota as never);

      const result = await service.generate('t1', 'u1', {
        type: 'vows',
        prompt: '写一段婚礼誓言'
      } as never);

      expect(quota.checkQuota).toHaveBeenCalledWith('t1', 'u1');
      expect(llm.chat).toHaveBeenCalledWith('写一段婚礼誓言', expect.any(String));
      expect(prisma.aiTextGeneration.create).toHaveBeenCalled();
      expect(quota.recordUsage).toHaveBeenCalledWith('t1', 'u1', 'text_generate', expect.objectContaining({ type: 'vows' }));
      expect(result).toEqual({ id: 'tg1' });
    });

    it('prepends style and language hints to the prompt', async () => {
      const prisma = { aiTextGeneration: { create: vi.fn().mockResolvedValue({ id: 'tg1' }) } };
      const llm = buildLlm();
      const service = new TextGenerationService(prisma as never, llm as never, buildQuota() as never);

      await service.generate('t1', 'u1', {
        type: 'vows',
        prompt: '写誓言',
        style: '浪漫',
        language: 'en'
      } as never);

      const fullPrompt = llm.chat.mock.calls[0]![0] as string;
      expect(fullPrompt).toContain('风格要求: 浪漫');
      expect(fullPrompt).toContain('英文');
    });

    it('throws AI_INVALID_TEXT_TYPE when type is unknown', async () => {
      const service = new TextGenerationService({} as never, buildLlm() as never, buildQuota() as never);
      await expect(
        service.generate('t1', 'u1', { type: 'unknown_type', prompt: 'p' } as never)
      ).rejects.toBeInstanceOf(BusinessException);
    });

    it('throws AI_GENERATION_FAILED when LLM call fails', async () => {
      const llm = { chat: vi.fn().mockRejectedValue(new Error('LLM timeout')) };
      const service = new TextGenerationService({} as never, llm as never, buildQuota() as never);
      await expect(
        service.generate('t1', 'u1', { type: 'wedding_vow', prompt: 'p' } as never)
      ).rejects.toBeInstanceOf(BusinessException);
    });

    it('propagates quota error when quota check fails', async () => {
      const quota = { checkQuota: vi.fn().mockRejectedValue(new Error('QUOTA_EXCEEDED')), recordUsage: vi.fn() };
      const service = new TextGenerationService({} as never, buildLlm() as never, quota as never);
      await expect(
        service.generate('t1', 'u1', { type: 'vows', prompt: 'p' } as never)
      ).rejects.toThrow('QUOTA_EXCEEDED');
    });
  });

  describe('refine', () => {
    it('loads original, builds refine prompt, creates new record with metadata', async () => {
      const original = {
        id: 'orig1', tenantId: 't1', type: 'vows',
        prompt: '原始需求', result: '原始结果', style: null, language: 'zh'
      };
      const prisma = {
        aiTextGeneration: {
          findFirst: vi.fn().mockResolvedValue(original),
          create: vi.fn().mockResolvedValue({ id: 'refined1' })
        }
      };
      const llm = buildLlm();
      const quota = buildQuota();
      const service = new TextGenerationService(prisma as never, llm as never, quota as never);

      const result = await service.refine('t1', 'u1', 'orig1', {
        feedback: '请更浪漫一点'
      } as never);

      expect(quota.checkQuota).toHaveBeenCalledWith('t1', 'u1');
      const refinePrompt = llm.chat.mock.calls[0]![0] as string;
      expect(refinePrompt).toContain('原始需求');
      expect(refinePrompt).toContain('原始结果');
      expect(refinePrompt).toContain('请更浪漫一点');
      expect(quota.recordUsage).toHaveBeenCalledWith('t1', 'u1', 'text_refine', expect.objectContaining({ originalId: 'orig1' }));
      expect(result).toEqual({ id: 'refined1' });
    });

    it('throws RESOURCE_NOT_FOUND when original does not exist', async () => {
      const prisma = { aiTextGeneration: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      await expect(
        service.refine('t1', 'u1', 'missing', { feedback: 'f' } as never)
      ).rejects.toBeInstanceOf(BusinessException);
    });

    it('propagates quota error when quota check fails', async () => {
      const quota = { checkQuota: vi.fn().mockRejectedValue(new Error('QUOTA_EXCEEDED')), recordUsage: vi.fn() };
      const service = new TextGenerationService({} as never, buildLlm() as never, quota as never);
      await expect(
        service.refine('t1', 'u1', 'orig1', { feedback: 'f' } as never)
      ).rejects.toThrow('QUOTA_EXCEEDED');
    });

    it('appends style to system prompt when provided', async () => {
      const original = {
        id: 'orig1', tenantId: 't1', type: 'vows',
        prompt: '原始需求', result: '原始结果', style: null, language: 'zh'
      };
      const prisma = {
        aiTextGeneration: {
          findFirst: vi.fn().mockResolvedValue(original),
          create: vi.fn().mockResolvedValue({ id: 'refined1' })
        }
      };
      const llm = buildLlm();
      const service = new TextGenerationService(prisma as never, llm as never, buildQuota() as never);

      await service.refine('t1', 'u1', 'orig1', {
        feedback: '请更浪漫一点', style: '典雅'
      } as never);

      const systemPrompt = llm.chat.mock.calls[0]![1] as string;
      expect(systemPrompt).toContain('典雅');
    });
  });

  describe('list', () => {
    it('paginates with optional type, projectId, isBookmarked filters', async () => {
      const prisma = {
        aiTextGeneration: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      const result = await service.list('t1', { page: 2, pageSize: 5, type: 'vows', projectId: 'p1', isBookmarked: true } as never);
      expect(prisma.aiTextGeneration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', type: 'vows', projectId: 'p1', isBookmarked: true },
          skip: 5, take: 5
        })
      );
      expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 5, totalPages: 0 });
    });
  });

  describe('getById', () => {
    it('returns the generation record', async () => {
      const gen = { id: 'tg1' };
      const prisma = { aiTextGeneration: { findFirst: vi.fn().mockResolvedValue(gen) } };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      const result = await service.getById('t1', 'tg1');
      expect(result).toEqual(gen);
    });

    it('throws RESOURCE_NOT_FOUND when missing', async () => {
      const prisma = { aiTextGeneration: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      await expect(service.getById('t1', 'missing')).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe('updateBookmark', () => {
    it('updates the isBookmarked flag', async () => {
      const prisma = {
        aiTextGeneration: {
          findFirst: vi.fn().mockResolvedValue({ id: 'tg1' }),
          update: vi.fn().mockResolvedValue({ id: 'tg1', isBookmarked: true })
        }
      };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      await service.updateBookmark('t1', 'tg1', true);
      expect(prisma.aiTextGeneration.update).toHaveBeenCalledWith({ where: { id: 'tg1' }, data: { isBookmarked: true } });
    });

    it('throws RESOURCE_NOT_FOUND when missing', async () => {
      const prisma = { aiTextGeneration: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      await expect(service.updateBookmark('t1', 'missing', true)).rejects.toBeInstanceOf(BusinessException);
    });
  });

  describe('delete', () => {
    it('deletes the record and returns { deleted: true }', async () => {
      const prisma = {
        aiTextGeneration: {
          findFirst: vi.fn().mockResolvedValue({ id: 'tg1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      const result = await service.delete('t1', 'tg1');
      expect(result).toEqual({ deleted: true });
      expect(prisma.aiTextGeneration.delete).toHaveBeenCalledWith({ where: { id: 'tg1' } });
    });

    it('throws RESOURCE_NOT_FOUND when missing', async () => {
      const prisma = { aiTextGeneration: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new TextGenerationService(prisma as never, buildLlm() as never, buildQuota() as never);
      await expect(service.delete('t1', 'missing')).rejects.toBeInstanceOf(BusinessException);
    });
  });
});
