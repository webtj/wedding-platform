import { describe, expect, it, vi } from 'vitest';
import { AiMetricsService } from './ai-metrics.service';

const COMPLETED = 'completed';
const FAILED = 'failed';
const PENDING = 'pending';

describe('AiMetricsService', () => {
  describe('getSummary', () => {
    it('returns zeroed structure when no generations exist', async () => {
      const prisma = { aiGeneration: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new AiMetricsService(prisma as never);
      const result = await service.getSummary('t1', 7);

      expect(result.totalGenerations).toBe(0);
      expect(result.successfulGenerations).toBe(0);
      expect(result.failedGenerations).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.avgLatencyMs).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.byProvider).toEqual({});
      expect(result.byMaterialType).toEqual({});
      expect(result.dailyUsage).toEqual([]);
    });

    it('aggregates by provider, material type, and date from metadata', async () => {
      const generations = [
        {
          status: COMPLETED,
          metadata: { provider: 'openai', latencyMs: 1200, cost: 0.05 },
          createdAt: new Date('2026-05-01T10:00:00Z'),
          materialType: { code: 'photo' }
        },
        {
          status: COMPLETED,
          metadata: { provider: 'openai', latencyMs: 800, cost: 0.03 },
          createdAt: new Date('2026-05-01T14:00:00Z'),
          materialType: { code: 'photo' }
        },
        {
          status: FAILED,
          metadata: { provider: 'flux', latencyMs: 500 },
          createdAt: new Date('2026-05-02T09:00:00Z'),
          materialType: null
        }
      ];
      const prisma = { aiGeneration: { findMany: vi.fn().mockResolvedValue(generations) } };
      const service = new AiMetricsService(prisma as never);
      const result = await service.getSummary('t1', 30);

      expect(result.totalGenerations).toBe(3);
      expect(result.successfulGenerations).toBe(2);
      expect(result.failedGenerations).toBe(1);
      expect(result.successRate).toBeCloseTo(66.67, 1);

      expect(result.byProvider['openai']).toEqual({
        count: 2, successRate: 100, avgLatencyMs: 1000
      });
      expect(result.byProvider['flux']).toEqual({
        count: 1, successRate: 0, avgLatencyMs: 500
      });

      expect(result.byMaterialType['photo']).toBe(2);
      expect(result.byMaterialType['unknown']).toBe(1);

      expect(result.dailyUsage).toEqual([
        { date: '2026-05-01', count: 2 },
        { date: '2026-05-02', count: 1 }
      ]);

      expect(result.totalCost).toBeCloseTo(0.08);
      expect(result.avgLatencyMs).toBeCloseTo(833.33, 1);
    });

    it('defaults provider to unknown when metadata.provider is missing', async () => {
      const generations = [
        { status: COMPLETED, metadata: {}, createdAt: new Date('2026-05-01T00:00:00Z'), materialType: null }
      ];
      const prisma = { aiGeneration: { findMany: vi.fn().mockResolvedValue(generations) } };
      const service = new AiMetricsService(prisma as never);
      const result = await service.getSummary('t1');
      expect(result.byProvider['unknown']).toBeDefined();
    });

    it('passes the correct days window to createdAt filter', async () => {
      const prisma = { aiGeneration: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new AiMetricsService(prisma as never);
      await service.getSummary('t1', 14);

      const whereArg = prisma.aiGeneration.findMany.mock.calls[0]![0].where;
      expect(whereArg).toMatchObject({ tenantId: 't1' });
      const since = (whereArg.createdAt as { gte: Date }).gte;
      const diffDays = Math.round((Date.now() - since.getTime()) / 86400000);
      expect(diffDays).toBeGreaterThanOrEqual(13);
      expect(diffDays).toBeLessThanOrEqual(15);
    });
  });

  describe('recordFeedback', () => {
    it('logs feedback without throwing', async () => {
      const prisma = {} as never;
      const service = new AiMetricsService(prisma);
      await expect(
        service.recordFeedback('t1', 'u1', 'gen1', 'img1', 5, '很好')
      ).resolves.toBeUndefined();
    });
  });
});
