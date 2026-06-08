import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RequestLoggerMiddleware } from './request-logger.middleware';

function createMockLogQueue() {
  return {
    addRequest: vi.fn(),
    addError: vi.fn(),
    addAudit: vi.fn(),
    addEvent: vi.fn(),
  };
}

function createMockRequest(overrides: Record<string, any> = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/test',
    url: '/api/test',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'test-agent' },
    auth: undefined as any,
    traceId: undefined as string | undefined,
    ...overrides,
  };
}

function createMockResponse() {
  const listeners: Record<string, Function> = {};
  return {
    statusCode: 200,
    on: vi.fn((event: string, fn: Function) => {
      listeners[event] = fn;
    }),
    _emit: (event: string) => listeners[event]?.(),
  };
}

describe('RequestLoggerMiddleware', () => {
  let logQueue: ReturnType<typeof createMockLogQueue>;
  let middleware: RequestLoggerMiddleware;

  beforeEach(() => {
    vi.clearAllMocks();
    logQueue = createMockLogQueue();
    middleware = new RequestLoggerMiddleware(logQueue as never);
  });

  describe('request logging captures correct data', () => {
    it('logs request method, path, status code, and duration', () => {
      const req = createMockRequest({ method: 'POST', originalUrl: '/api/projects' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);

      res._emit('finish');

      expect(logQueue.addRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/api/projects',
          statusCode: 200,
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('captures duration as a number', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      const call = logQueue.addRequest.mock.calls[0]![0];
      expect(typeof call.duration).toBe('number');
      expect(call.duration).toBeGreaterThanOrEqual(0);
    });

    it('includes userId and tenantId from auth context', () => {
      const req = createMockRequest({
        auth: { userId: 'user-1', tenantId: 'tenant-1' },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      expect(logQueue.addRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
        }),
      );
    });

    it('omits userId and tenantId when no auth context', () => {
      const req = createMockRequest({ auth: undefined });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      const call = logQueue.addRequest.mock.calls[0]![0];
      expect(call.userId).toBeUndefined();
      expect(call.tenantId).toBeUndefined();
    });

    it('falls back to socket.remoteAddress when ip is missing', () => {
      const req = createMockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.1' } });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      expect(logQueue.addRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ip: '10.0.0.1' }),
      );
    });

    it('uses request.url as fallback when originalUrl is missing', () => {
      const req = createMockRequest({ originalUrl: undefined, url: '/fallback' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      expect(logQueue.addRequest).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/fallback' }),
      );
    });

    it('includes tenantId as undefined when auth.tenantId is null', () => {
      const req = createMockRequest({
        auth: { userId: 'user-1', tenantId: null },
      });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      const call = logQueue.addRequest.mock.calls[0]![0];
      expect(call.tenantId).toBeUndefined();
    });
  });

  describe('traceId generation', () => {
    it('generates a UUID traceId and attaches it to the request', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);

      expect(req.traceId).toBeDefined();
      expect(typeof req.traceId).toBe('string');
      // UUID v4 format
      expect(req.traceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('passes the same traceId to the log entry', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      const traceId = req.traceId;
      expect(logQueue.addRequest).toHaveBeenCalledWith(
        expect.objectContaining({ traceId }),
      );
    });

    it('generates unique traceIds for different requests', () => {
      const req1 = createMockRequest();
      const req2 = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req1 as any, res as any, next);
      middleware.use(req2 as any, res as any, next);

      expect(req1.traceId).not.toBe(req2.traceId);
    });
  });

  describe('skip health endpoints', () => {
    it.each(['/health', '/api/health', '/'])('skips logging for %s', (path) => {
      const req = createMockRequest({ originalUrl: path });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      expect(logQueue.addRequest).not.toHaveBeenCalled();
    });

    it('skips health endpoint with query string', () => {
      const req = createMockRequest({ originalUrl: '/health?check=live' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      expect(logQueue.addRequest).not.toHaveBeenCalled();
    });

    it('does not skip similar but different paths', () => {
      const req = createMockRequest({ originalUrl: '/api/healthcheck' });
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);
      res._emit('finish');

      expect(logQueue.addRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('next() is always called', () => {
    it('calls next() immediately without waiting for response', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      middleware.use(req as any, res as any, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
