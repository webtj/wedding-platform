import { describe, expect, it, vi } from 'vitest';
import { AnalyticsController } from './analytics.controller';

function createMockLogQueue() {
  return {
    addEvent: vi.fn(),
    addError: vi.fn(),
  };
}

describe('AnalyticsController', () => {
  it('stores page views as behavior events', () => {
    const logQueue = createMockLogQueue();
    const controller = new AnalyticsController(logQueue as never);

    controller.ingest([
      {
        event: 'page_view',
        properties: { path: '/admin/logs' },
        userId: 'user-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        timestamp: '2024-06-01T10:00:00.000Z',
        url: 'https://example.com/admin/logs?tab=overview',
        userAgent: 'Mozilla/5.0',
      },
    ]);

    expect(logQueue.addEvent).toHaveBeenCalledTimes(1);
    expect(logQueue.addEvent).toHaveBeenCalledWith({
      eventType: 'page_view',
      eventName: '/admin/logs',
      userId: 'user-1',
      tenantId: 'tenant-1',
      page: '/admin/logs',
      properties: { path: '/admin/logs' },
      sessionId: 'session-1',
      timestamp: new Date('2024-06-01T10:00:00.000Z'),
    });
  });

  it('routes analytics errors into the error log queue', () => {
    const logQueue = createMockLogQueue();
    const controller = new AnalyticsController(logQueue as never);

    controller.ingest([
      {
        event: 'error',
        properties: {
          message: 'boom',
          stack: 'stack-trace',
        },
        sessionId: 'session-2',
        userId: 'user-2',
        tenantId: 'tenant-2',
        timestamp: '2024-06-01T11:00:00.000Z',
        url: 'https://example.com/admin/logs',
      },
    ]);

    expect(logQueue.addError).toHaveBeenCalledTimes(1);
    expect(logQueue.addError).toHaveBeenCalledWith({
      traceId: 'session-2',
      message: 'boom',
      stack: 'stack-trace',
      path: '/admin/logs',
      userId: 'user-2',
      tenantId: 'tenant-2',
      requestBody: {
        event: 'error',
        properties: {
          message: 'boom',
          stack: 'stack-trace',
        },
        sessionId: 'session-2',
        url: 'https://example.com/admin/logs',
        userAgent: null,
      },
      timestamp: new Date('2024-06-01T11:00:00.000Z'),
    });
  });
});
