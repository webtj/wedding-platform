import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LogService } from './log.service';

function createMockPrisma() {
  return {
    logRequest: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _avg: { duration: 0 } }),
    },
    logError: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    logAudit: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    logEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
}

describe('LogService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: LogService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new LogService(prisma as never);
  });

  describe('queryRequestLogs', () => {
    it('returns paginated request logs with defaults', async () => {
      const items = [{ id: '1', method: 'GET', path: '/api/test' }];
      prisma.logRequest.findMany.mockResolvedValue(items);
      prisma.logRequest.count.mockResolvedValue(1);

      const result = await service.queryRequestLogs({
        page: 1,
        pageSize: 20,
      });

      expect(result).toEqual({ items, total: 1, page: 1, pageSize: 20 });
      expect(prisma.logRequest.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(prisma.logRequest.count).toHaveBeenCalledWith({ where: {} });
    });

    it('applies pagination offset correctly', async () => {
      prisma.logRequest.findMany.mockResolvedValue([]);
      prisma.logRequest.count.mockResolvedValue(50);

      await service.queryRequestLogs({ page: 3, pageSize: 10 });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('filters by userId', async () => {
      await service.queryRequestLogs({ page: 1, pageSize: 20, userId: 'user-1' });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('filters by tenantId', async () => {
      await service.queryRequestLogs({ page: 1, pageSize: 20, tenantId: 'tenant-1' });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });

    it('filters by path with case-insensitive contains', async () => {
      await service.queryRequestLogs({ page: 1, pageSize: 20, path: '/api/users' });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { path: { contains: '/api/users', mode: 'insensitive' } },
        }),
      );
    });

    it('filters by statusCode', async () => {
      await service.queryRequestLogs({ page: 1, pageSize: 20, statusCode: 500 });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { statusCode: 500 } }),
      );
    });

    it('filters by method (uppercased)', async () => {
      await service.queryRequestLogs({ page: 1, pageSize: 20, method: 'post' });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { method: 'POST' } }),
      );
    });

    it('applies date range filter', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');

      await service.queryRequestLogs({
        page: 1,
        pageSize: 20,
        startDate: start,
        endDate: end,
      });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { createdAt: { gte: start, lte: end } },
        }),
      );
    });

    it('combines multiple filters', async () => {
      const start = new Date('2024-01-01');

      await service.queryRequestLogs({
        page: 1,
        pageSize: 20,
        userId: 'user-1',
        method: 'GET',
        startDate: start,
      });

      expect(prisma.logRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            method: 'GET',
            createdAt: { gte: start },
          },
        }),
      );
    });
  });

  describe('queryErrorLogs', () => {
    it('returns paginated error logs', async () => {
      const items = [{ id: '1', message: 'Something broke' }];
      prisma.logError.findMany.mockResolvedValue(items);
      prisma.logError.count.mockResolvedValue(1);

      const result = await service.queryErrorLogs({ page: 1, pageSize: 20 });

      expect(result).toEqual({ items, total: 1, page: 1, pageSize: 20 });
    });

    it('filters by userId and tenantId', async () => {
      await service.queryErrorLogs({
        page: 1,
        pageSize: 20,
        userId: 'user-1',
        tenantId: 'tenant-1',
      });

      expect(prisma.logError.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', tenantId: 'tenant-1' },
        }),
      );
    });

    it('filters by path', async () => {
      await service.queryErrorLogs({ page: 1, pageSize: 20, path: '/api/orders' });

      expect(prisma.logError.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { path: { contains: '/api/orders', mode: 'insensitive' } },
        }),
      );
    });
  });

  describe('queryAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      const items = [{ id: '1', action: 'create', entity: 'project' }];
      prisma.logAudit.findMany.mockResolvedValue(items);
      prisma.logAudit.count.mockResolvedValue(1);

      const result = await service.queryAuditLogs({ page: 1, pageSize: 20 });

      expect(result).toEqual({ items, total: 1, page: 1, pageSize: 20 });
    });

    it('filters by action and entity', async () => {
      await service.queryAuditLogs({
        page: 1,
        pageSize: 20,
        action: 'delete',
        entity: 'project',
      });

      expect(prisma.logAudit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: 'delete', entity: 'project' },
        }),
      );
    });
  });

  describe('queryEventLogs', () => {
    it('returns paginated event logs', async () => {
      const items = [{ id: '1', eventType: 'click', eventName: 'button_press' }];
      prisma.logEvent.findMany.mockResolvedValue(items);
      prisma.logEvent.count.mockResolvedValue(1);

      const result = await service.queryEventLogs({ page: 1, pageSize: 20 });

      expect(result).toEqual({ items, total: 1, page: 1, pageSize: 20 });
    });

    it('filters by eventType and eventName', async () => {
      await service.queryEventLogs({
        page: 1,
        pageSize: 20,
        eventType: 'page_view',
        eventName: 'home',
      });

      expect(prisma.logEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventType: 'page_view', eventName: 'home' },
        }),
      );
    });
  });

  describe('getOverviewStats', () => {
    it('returns overview stats without date filter', async () => {
      prisma.logRequest.count.mockResolvedValue(100);
      prisma.logError.count.mockResolvedValue(5);
      prisma.logRequest.aggregate.mockResolvedValue({ _avg: { duration: 42 } });

      const result = await service.getOverviewStats({});

      expect(result).toEqual({
        totalRequests: 100,
        totalErrors: 5,
        avgDuration: 42,
      });
      expect(prisma.logRequest.count).toHaveBeenCalledWith({ where: {} });
      expect(prisma.logError.count).toHaveBeenCalledWith({ where: {} });
    });

    it('returns overview stats with date filter', async () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      prisma.logRequest.count.mockResolvedValue(50);
      prisma.logError.count.mockResolvedValue(2);
      prisma.logRequest.aggregate.mockResolvedValue({ _avg: { duration: 30 } });

      const result = await service.getOverviewStats({ startDate: start, endDate: end });

      expect(result).toEqual({
        totalRequests: 50,
        totalErrors: 2,
        avgDuration: 30,
      });
      expect(prisma.logRequest.count).toHaveBeenCalledWith({
        where: { createdAt: { gte: start, lte: end } },
      });
    });

    it('rounds avgDuration to integer', async () => {
      prisma.logRequest.count.mockResolvedValue(10);
      prisma.logError.count.mockResolvedValue(0);
      prisma.logRequest.aggregate.mockResolvedValue({ _avg: { duration: 42.7 } });

      const result = await service.getOverviewStats({});

      expect(result.avgDuration).toBe(43);
    });

    it('returns 0 for avgDuration when null', async () => {
      prisma.logRequest.count.mockResolvedValue(0);
      prisma.logError.count.mockResolvedValue(0);
      prisma.logRequest.aggregate.mockResolvedValue({ _avg: { duration: null } });

      const result = await service.getOverviewStats({});

      expect(result.avgDuration).toBe(0);
    });
  });

  describe('getErrorsByDay', () => {
    it('returns errors grouped by day', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { day: '2024-06-01', count: 3n },
        { day: '2024-06-02', count: 5n },
      ]);

      const result = await service.getErrorsByDay({});

      expect(result).toEqual([
        { day: '2024-06-01', count: 3 },
        { day: '2024-06-02', count: 5 },
      ]);
    });

    it('converts bigint counts to numbers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ day: '2024-06-01', count: 1000n }]);

      const result = await service.getErrorsByDay({});

      expect(result[0]!.count).toBe(1000);
      expect(typeof result[0]!.count).toBe('number');
    });
  });

  describe('getRequestsByHour', () => {
    it('returns requests grouped by hour', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { hour: 9, count: 50n },
        { hour: 14, count: 120n },
      ]);

      const result = await service.getRequestsByHour({});

      expect(result).toEqual([
        { hour: 9, count: 50 },
        { hour: 14, count: 120 },
      ]);
    });
  });

  describe('getTopErrors', () => {
    it('returns top 10 errors', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { message: 'Not Found', path: '/api/x', count: 30n },
        { message: 'Server Error', path: null, count: 10n },
      ]);

      const result = await service.getTopErrors({});

      expect(result).toEqual([
        { message: 'Not Found', path: '/api/x', count: 30 },
        { message: 'Server Error', path: null, count: 10 },
      ]);
    });

    it('builds date condition in raw query', async () => {
      const start = new Date('2024-01-01T00:00:00.000Z');
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getTopErrors({ startDate: start });

      const dateCondition = prisma.$queryRaw.mock.calls[0]![1] as {
        values: unknown[];
      };
      expect(dateCondition.values[0]).toBe(start);
      expect(dateCondition.values[1]).toBeInstanceOf(Date);
    });

    it('uses a default date window when no dates are provided', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getTopErrors({});

      const dateCondition = prisma.$queryRaw.mock.calls[0]![1] as {
        values: unknown[];
      };
      expect(dateCondition.values).toHaveLength(2);
      expect(dateCondition.values[0]).toBeInstanceOf(Date);
      expect(dateCondition.values[1]).toBeInstanceOf(Date);
    });
  });

  describe('getSlowRequests', () => {
    it('returns slow requests with camelCase keys', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          method: 'GET',
          path: '/api/heavy',
          avg_duration: 500,
          max_duration: 1200,
          count: 10n,
        },
      ]);

      const result = await service.getSlowRequests({});

      expect(result).toEqual([
        {
          method: 'GET',
          path: '/api/heavy',
          avgDuration: 500,
          maxDuration: 1200,
          count: 10,
        },
      ]);
    });
  });
});
