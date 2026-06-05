import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service';

const buildProvider = () => ({
  generate: vi.fn().mockReturnValue({ title: '生成标题', content: '生成内容' })
});

describe('AiService', () => {
  describe('listOutputs', () => {
    it('lists AI outputs for a project ordered by createdAt desc', async () => {
      const prisma = { aiOutput: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new AiService(prisma as never, buildProvider() as never, { record: vi.fn() } as never);
      await service.listOutputs({ tenantId: 't1', projectId: 'p1' });
      expect(prisma.aiOutput.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', projectId: 'p1' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('createJob', () => {
    it('throws NotFound when project does not exist', async () => {
      const prisma = { project: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new AiService(prisma as never, buildProvider() as never, { record: vi.fn() } as never);
      await expect(
        service.createJob({ tenantId: 't1', userId: 'u1', projectId: 'p1', data: { type: 'vows', prompt: '写誓言' } as never })
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('generates content, creates job with output, and writes audit log', async () => {
      const project = { id: 'p1', brideName: '新娘', groomName: '新郎' };
      const job = { id: 'j1', outputs: [{ id: 'o1' }] };
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(project) },
        aiJob: { create: vi.fn().mockResolvedValue(job) }
      };
      const provider = buildProvider();
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new AiService(prisma as never, provider as never, audit as never);

      const result = await service.createJob({
        tenantId: 't1', userId: 'u1', projectId: 'p1',
        data: { type: 'vows', prompt: '写婚礼誓言' } as never
      });

      expect(provider.generate).toHaveBeenCalledWith({
        type: 'vows', prompt: '写婚礼誓言', projectName: '新娘 & 新郎'
      });
      expect(prisma.aiJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1', projectId: 'p1', type: 'vows', prompt: '写婚礼誓言',
          status: 'succeeded',
          outputs: {
            create: { tenantId: 't1', projectId: 'p1', title: '生成标题', content: '生成内容' }
          }
        }),
        include: { outputs: true }
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ai.job.create', entityId: 'j1' })
      );
      expect(result).toEqual(job);
    });
  });
});
