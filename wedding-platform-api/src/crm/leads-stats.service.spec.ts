import { describe, expect, it, vi } from 'vitest';
import { LeadsStatsService } from './leads-stats.service';

describe('LeadsStatsService', () => {
  describe('getConversionFunnel', () => {
    it('aggregates lead counts per status in canonical order', async () => {
      const counts = [
        { status: 'new', _count: { id: 10 } },
        { status: 'won', _count: { id: 3 } },
        { status: 'contacted', _count: { id: 5 } }
      ];
      const prisma = { lead: { groupBy: vi.fn().mockResolvedValue(counts) } };
      const service = new LeadsStatsService(prisma as never);

      const result = await service.getConversionFunnel('t1');
      expect(result).toEqual([
        { status: 'new', count: 10 },
        { status: 'contacted', count: 5 },
        { status: 'quoted', count: 0 },
        { status: 'negotiating', count: 0 },
        { status: 'won', count: 3 },
        { status: 'lost', count: 0 }
      ]);
    });

    it('applies startDate and endDate filters when provided', async () => {
      const prisma = { lead: { groupBy: vi.fn().mockResolvedValue([]) } };
      const service = new LeadsStatsService(prisma as never);
      const start = new Date('2026-01-01');
      const end = new Date('2026-12-31');
      await service.getConversionFunnel('t1', start, end);
      expect(prisma.lead.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { tenantId: 't1', createdAt: { gte: start, lte: end } },
        _count: { id: true }
      });
    });
  });

  describe('getLeadsBySource', () => {
    it('returns lead counts grouped by source channel', async () => {
      const counts = [
        { sourceChannel: 'douyin', _count: { id: 12 } },
        { sourceChannel: 'xiaohongshu', _count: { id: 4 } }
      ];
      const prisma = { lead: { groupBy: vi.fn().mockResolvedValue(counts) } };
      const service = new LeadsStatsService(prisma as never);

      const result = await service.getLeadsBySource('t1');
      expect(result).toEqual([
        { source: 'douyin', count: 12 },
        { source: 'xiaohongshu', count: 4 }
      ]);
    });

    it('applies startDate and endDate filters when provided', async () => {
      const prisma = { lead: { groupBy: vi.fn().mockResolvedValue([]) } };
      const service = new LeadsStatsService(prisma as never);
      const start = new Date('2026-01-01');
      await service.getLeadsBySource('t1', start);
      expect(prisma.lead.groupBy).toHaveBeenCalledWith({
        by: ['sourceChannel'],
        where: { tenantId: 't1', createdAt: { gte: start } },
        _count: { id: true }
      });
    });
  });

  describe('getLeadsByTime', () => {
    it('runs day-granularity raw query and maps rows to ISO dates + numbers', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockResolvedValue([
          { date: new Date('2026-05-01T00:00:00Z'), total: BigInt(10), won: BigInt(3) }
        ])
      };
      const service = new LeadsStatsService(prisma as never);
      const result = await service.getLeadsByTime('t1');
      expect(result).toEqual([{ date: '2026-05-01', total: 10, won: 3 }]);
    });

    it('uses DATE_TRUNC week when granularity=week', async () => {
      const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
      const service = new LeadsStatsService(prisma as never);
      await service.getLeadsByTime('t1', undefined, undefined, 'week');
      const sqlArg = (prisma.$queryRaw.mock.calls[0] as unknown[])[0] as { strings: string[] };
      expect(sqlArg.strings.join('')).toContain("DATE_TRUNC('week'");
    });

    it('includes date conditions in the raw where clause', async () => {
      const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
      const service = new LeadsStatsService(prisma as never);
      const start = new Date('2026-01-01');
      const end = new Date('2026-12-31');
      await service.getLeadsByTime('t1', start, end);
      const sqlArg = (prisma.$queryRaw.mock.calls[0] as unknown[])[0] as { strings: string[] };
      expect(sqlArg.strings.join('')).toContain('"createdAt"');
    });
  });

  describe('getConversionRate', () => {
    it('computes rounded percentage of won / total', async () => {
      const prisma = { lead: { count: vi.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(5) } };
      const service = new LeadsStatsService(prisma as never);
      const result = await service.getConversionRate('t1');
      expect(result).toEqual({ total: 20, won: 5, rate: 25 });
    });

    it('returns 0% rate when total is zero', async () => {
      const prisma = { lead: { count: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0) } };
      const service = new LeadsStatsService(prisma as never);
      const result = await service.getConversionRate('t1');
      expect(result.rate).toBe(0);
    });
  });

  describe('getAverageConversionTime', () => {
    it('returns 0 when no converted leads in window', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ avgDays: null, sampleSize: BigInt(0) }])
      };
      const service = new LeadsStatsService(prisma as never);
      const result = await service.getAverageConversionTime('t1');
      expect(result).toEqual({ avgDays: 0, sampleSize: 0 });
    });

    it('rounds avgDays to 1 decimal when sample size > 0', async () => {
      const prisma = {
        $queryRaw: vi.fn().mockResolvedValue([{ avgDays: 12.34567, sampleSize: BigInt(4) }])
      };
      const service = new LeadsStatsService(prisma as never);
      const result = await service.getAverageConversionTime('t1');
      expect(result.avgDays).toBe(12.3);
      expect(result.sampleSize).toBe(4);
    });
  });

  describe('getOverview', () => {
    it('aggregates funnel, bySource, conversionRate, and avgConversionTime in parallel', async () => {
      const prisma = {
        lead: {
          groupBy: vi
            .fn()
            .mockResolvedValueOnce([{ status: 'new', _count: { id: 5 } }])
            .mockResolvedValueOnce([{ sourceChannel: 'douyin', _count: { id: 5 } }]),
          count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(2)
        },
        $queryRaw: vi.fn().mockResolvedValue([{ avgDays: 7, sampleSize: BigInt(2) }])
      };
      const service = new LeadsStatsService(prisma as never);
      const result = await service.getOverview('t1');
      expect(result.funnel).toBeDefined();
      expect(result.bySource).toEqual([{ source: 'douyin', count: 5 }]);
      expect(result.conversionRate).toEqual({ total: 5, won: 2, rate: 40 });
      expect(result.avgConversionTime).toEqual({ avgDays: 7, sampleSize: 2 });
    });
  });
});
