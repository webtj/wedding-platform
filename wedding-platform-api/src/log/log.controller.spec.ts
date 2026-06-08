import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LogController } from './log.controller';

const mockLogService = {
  queryRequestLogs: vi.fn(),
  queryErrorLogs: vi.fn(),
  queryAuditLogs: vi.fn(),
  queryEventLogs: vi.fn(),
  getOverviewStats: vi.fn(),
  getErrorsByDay: vi.fn(),
  getRequestsByHour: vi.fn(),
  getTopErrors: vi.fn(),
  getSlowRequests: vi.fn(),
};

describe('LogController', () => {
  let controller: LogController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new LogController(mockLogService as never);
  });

  describe('queryRequestLogs', () => {
    it('parses query and delegates to service', async () => {
      const mockResult = { items: [], total: 0, page: 1, pageSize: 20 };
      mockLogService.queryRequestLogs.mockResolvedValue(mockResult);

      const result = await controller.queryRequestLogs({
        page: '1',
        pageSize: '20',
        method: 'get',
      });

      expect(result).toEqual(mockResult);
      expect(mockLogService.queryRequestLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
          method: 'get',
        }),
      );
    });

    it('applies default pagination when not provided', async () => {
      mockLogService.queryRequestLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      await controller.queryRequestLogs({});

      expect(mockLogService.queryRequestLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 }),
      );
    });

    it('parses optional filters', async () => {
      mockLogService.queryRequestLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      await controller.queryRequestLogs({
        page: '2',
        pageSize: '50',
        userId: 'user-1',
        tenantId: 'tenant-1',
        path: '/api/test',
        statusCode: '404',
        method: 'POST',
      });

      expect(mockLogService.queryRequestLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 50,
          userId: 'user-1',
          tenantId: 'tenant-1',
          path: '/api/test',
          statusCode: 404,
          method: 'POST',
        }),
      );
    });

    it('parses date range filters', async () => {
      mockLogService.queryRequestLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      await controller.queryRequestLogs({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      const arg = mockLogService.queryRequestLogs.mock.calls[0]![0];
      expect(arg.startDate).toBeInstanceOf(Date);
      expect(arg.endDate).toBeInstanceOf(Date);
    });
  });

  describe('queryErrorLogs', () => {
    it('parses query and delegates to service', async () => {
      const mockResult = { items: [{ id: '1' }], total: 1, page: 1, pageSize: 20 };
      mockLogService.queryErrorLogs.mockResolvedValue(mockResult);

      const result = await controller.queryErrorLogs({ page: '1', pageSize: '20' });

      expect(result).toEqual(mockResult);
      expect(mockLogService.queryErrorLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 20 }),
      );
    });
  });

  describe('queryAuditLogs', () => {
    it('parses query with action and entity filters', async () => {
      mockLogService.queryAuditLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      await controller.queryAuditLogs({
        action: 'create',
        entity: 'project',
      });

      expect(mockLogService.queryAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', entity: 'project' }),
      );
    });
  });

  describe('queryEventLogs', () => {
    it('parses query with event filters', async () => {
      mockLogService.queryEventLogs.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      await controller.queryEventLogs({
        eventType: 'click',
        eventName: 'submit',
      });

      expect(mockLogService.queryEventLogs).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'click', eventName: 'submit' }),
      );
    });
  });

  describe('getOverviewStats', () => {
    it('delegates to service with parsed date range', async () => {
      const mockStats = { totalRequests: 100, totalErrors: 5, avgDuration: 42 };
      mockLogService.getOverviewStats.mockResolvedValue(mockStats);

      const result = await controller.getOverviewStats({});

      expect(result).toEqual(mockStats);
    });
  });

  describe('getErrorsByDay', () => {
    it('delegates to service', async () => {
      const mockData = [{ day: '2024-06-01', count: 3 }];
      mockLogService.getErrorsByDay.mockResolvedValue(mockData);

      const result = await controller.getErrorsByDay({});

      expect(result).toEqual(mockData);
    });
  });

  describe('getRequestsByHour', () => {
    it('delegates to service', async () => {
      const mockData = [{ hour: 9, count: 50 }];
      mockLogService.getRequestsByHour.mockResolvedValue(mockData);

      const result = await controller.getRequestsByHour({});

      expect(result).toEqual(mockData);
    });
  });

  describe('getTopErrors', () => {
    it('delegates to service', async () => {
      const mockData = [{ message: 'Not Found', path: '/api/x', count: 30 }];
      mockLogService.getTopErrors.mockResolvedValue(mockData);

      const result = await controller.getTopErrors({});

      expect(result).toEqual(mockData);
    });
  });

  describe('getSlowRequests', () => {
    it('delegates to service', async () => {
      const mockData = [{ method: 'GET', path: '/api/heavy', avgDuration: 500, maxDuration: 1200, count: 10 }];
      mockLogService.getSlowRequests.mockResolvedValue(mockData);

      const result = await controller.getSlowRequests({});

      expect(result).toEqual(mockData);
    });
  });

  describe('permission enforcement', () => {
    it('all endpoints are decorated with RequirePermissions(PLATFORM_LOG_READ)', () => {
      const endpoints = [
        'queryRequestLogs',
        'queryErrorLogs',
        'queryAuditLogs',
        'queryEventLogs',
        'getOverviewStats',
        'getErrorsByDay',
        'getRequestsByHour',
        'getTopErrors',
        'getSlowRequests',
      ];

      for (const endpoint of endpoints) {
        const descriptor = (LogController.prototype as any)[endpoint];
        const metadata = Reflect.getMetadata('required_permissions', descriptor);
        expect(metadata).toEqual(['platform.log.read']);
      }
    });

    it('controller uses JwtAuthGuard and PermissionsGuard', () => {
      const guards = Reflect.getMetadata('__guards__', LogController);
      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });
  });
});
