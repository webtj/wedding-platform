import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createMockLogQueue() {
  return {
    addRequest: vi.fn(),
    addError: vi.fn(),
    addAudit: vi.fn(),
    addEvent: vi.fn(),
  };
}

function createMockArgumentsHost(request: Record<string, any>, response: Record<string, any>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };
}

describe('AllExceptionsFilter', () => {
  let logQueue: ReturnType<typeof createMockLogQueue>;
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    vi.clearAllMocks();
    logQueue = createMockLogQueue();
    filter = new AllExceptionsFilter(logQueue as never);
  });

  describe('error logging captures correct data', () => {
    it('logs HttpException with correct status and message', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: { userId: 'user-1', tenantId: 'tenant-1' },
        traceId: 'trace-123',
        body: { key: 'value' },
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow();

      expect(logQueue.addError).toHaveBeenCalledWith({
        traceId: 'trace-123',
        message: 'Not Found',
        stack: exception.stack,
        path: '/api/test',
        userId: 'user-1',
        tenantId: 'tenant-1',
        requestBody: { key: 'value' },
      });
    });

    it('logs generic Error as 500', () => {
      const exception = new Error('Something broke');
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'POST',
        auth: undefined,
        traceId: 'trace-456',
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow();

      expect(logQueue.addError).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'trace-456',
          message: 'Something broke',
          stack: exception.stack,
          path: '/api/test',
          userId: undefined,
          tenantId: undefined,
        }),
      );
    });

    it('logs non-Error exceptions with String(message)', () => {
      const exception = 'string error';
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: undefined,
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow('string error');

      expect(logQueue.addError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error',
          stack: undefined,
        }),
      );
    });

    it('uses requestId as fallback when traceId is missing', () => {
      const exception = new Error('fail');
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: undefined,
        requestId: 'req-789',
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow();

      expect(logQueue.addError).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'req-789' }),
      );
    });

    it('uses "unknown" traceId when neither traceId nor requestId present', () => {
      const exception = new Error('fail');
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: undefined,
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow();

      expect(logQueue.addError).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'unknown' }),
      );
    });

    it('captures request body', () => {
      const exception = new Error('fail');
      const body = { name: 'test', nested: { value: 1 } };
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'POST',
        auth: undefined,
        traceId: 't1',
        body,
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow();

      expect(logQueue.addError).toHaveBeenCalledWith(
        expect.objectContaining({ requestBody: body }),
      );
    });
  });

  describe('proper error response returned', () => {
    it('re-throws HttpException so NestJS can handle the response', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: undefined,
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow(HttpException);
    });

    it('wraps non-Error exceptions in Error and re-throws', () => {
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: undefined,
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(42, host as any)).toThrow(Error);
    });

    it('re-throws generic Error directly', () => {
      const exception = new Error('internal');
      const request = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
        auth: undefined,
        body: {},
      };
      const response = { status: vi.fn(), json: vi.fn() };
      const host = createMockArgumentsHost(request, response);

      expect(() => filter.catch(exception, host as any)).toThrow(exception);
    });
  });
});
