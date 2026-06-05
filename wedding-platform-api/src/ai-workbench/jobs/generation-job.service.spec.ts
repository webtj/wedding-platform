import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GenerationJobService } from './generation-job.service';

describe('GenerationJobService', () => {
  describe('create', () => {
    it('creates a queued job with progress=0', async () => {
      const job = { id: 'j1', status: 'queued', progress: 0 };
      const prisma = { aiGenerationJob: { create: vi.fn().mockResolvedValue(job) } };
      const service = new GenerationJobService(prisma as never);

      const result = await service.create({ generationId: 'g1', tenantId: 't1', provider: 'openai', model: 'dall-e-3' });
      expect(result).toEqual(job);
      expect(prisma.aiGenerationJob.create).toHaveBeenCalledWith({
        data: {
          generationId: 'g1', tenantId: 't1',
          status: 'queued', progress: 0,
          provider: 'openai', model: 'dall-e-3'
        }
      });
    });

    it('defaults provider and model to null when omitted', async () => {
      const prisma = { aiGenerationJob: { create: vi.fn().mockResolvedValue({ id: 'j1' }) } };
      const service = new GenerationJobService(prisma as never);
      await service.create({ generationId: 'g1', tenantId: 't1' });
      expect(prisma.aiGenerationJob.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ provider: null, model: null }) })
      );
    });
  });

  describe('start', () => {
    it('updates status to processing with startedAt', async () => {
      const prisma = { aiGenerationJob: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new GenerationJobService(prisma as never);
      await service.start('j1', 't1');
      expect(prisma.aiGenerationJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'j1', tenantId: 't1' },
        data: { status: 'processing', startedAt: expect.any(Date) }
      });
    });
  });

  describe('updateProgress', () => {
    it('sets the progress percentage', async () => {
      const prisma = { aiGenerationJob: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new GenerationJobService(prisma as never);
      await service.updateProgress('j1', 't1', 50);
      expect(prisma.aiGenerationJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'j1', tenantId: 't1' },
        data: { progress: 50 }
      });
    });
  });

  describe('complete', () => {
    it('sets status=completed, progress=100, completedAt', async () => {
      const prisma = { aiGenerationJob: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new GenerationJobService(prisma as never);
      await service.complete('j1', 't1');
      expect(prisma.aiGenerationJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'j1', tenantId: 't1' },
        data: { status: 'completed', progress: 100, completedAt: expect.any(Date) }
      });
    });
  });

  describe('fail', () => {
    it('sets status=failed with errorMessage and completedAt', async () => {
      const prisma = { aiGenerationJob: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
      const service = new GenerationJobService(prisma as never);
      await service.fail('j1', 't1', 'LLM timeout');
      expect(prisma.aiGenerationJob.updateMany).toHaveBeenCalledWith({
        where: { id: 'j1', tenantId: 't1' },
        data: { status: 'failed', errorMessage: 'LLM timeout', completedAt: expect.any(Date) }
      });
    });
  });

  describe('findById', () => {
    it('returns the job when found', async () => {
      const job = { id: 'j1', status: 'completed' };
      const prisma = { aiGenerationJob: { findFirst: vi.fn().mockResolvedValue(job) } };
      const service = new GenerationJobService(prisma as never);
      const result = await service.findById('j1', 't1');
      expect(result).toEqual(job);
    });

    it('throws NotFound when job does not exist', async () => {
      const prisma = { aiGenerationJob: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new GenerationJobService(prisma as never);
      await expect(service.findById('missing', 't1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByGenerationId', () => {
    it('returns the latest job for a generation', async () => {
      const job = { id: 'j2', generationId: 'g1' };
      const prisma = { aiGenerationJob: { findFirst: vi.fn().mockResolvedValue(job) } };
      const service = new GenerationJobService(prisma as never);
      const result = await service.findByGenerationId('g1', 't1');
      expect(result).toEqual(job);
      expect(prisma.aiGenerationJob.findFirst).toHaveBeenCalledWith({
        where: { generationId: 'g1', tenantId: 't1' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('returns null when no job exists', async () => {
      const prisma = { aiGenerationJob: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new GenerationJobService(prisma as never);
      const result = await service.findByGenerationId('g1', 't1');
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('lists jobs with optional status filter', async () => {
      const prisma = { aiGenerationJob: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new GenerationJobService(prisma as never);
      await service.list('t1', 'failed');
      expect(prisma.aiGenerationJob.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    });

    it('lists all jobs when no status filter', async () => {
      const prisma = { aiGenerationJob: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new GenerationJobService(prisma as never);
      await service.list('t1');
      expect(prisma.aiGenerationJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 't1' } })
      );
    });
  });
});
