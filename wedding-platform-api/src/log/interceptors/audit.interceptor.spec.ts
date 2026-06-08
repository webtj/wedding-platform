import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';

function createMockLogQueue() {
  return {
    addRequest: vi.fn(),
    addError: vi.fn(),
    addAudit: vi.fn(),
    addEvent: vi.fn(),
  };
}

function createMockExecutionContext(request: Record<string, any>, controllerName = 'ProjectsController') {
  return {
    getHandler: vi.fn().mockReturnValue(function mockHandler() {}),
    getClass: vi.fn().mockReturnValue({ name: controllerName }),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
}

function createMockCallHandler(result?: any, error?: Error) {
  return {
    handle: vi.fn().mockReturnValue(
      error ? throwError(() => error) : of(result),
    ),
  };
}

describe('AuditInterceptor', () => {
  let reflector: Reflector;
  let logQueue: ReturnType<typeof createMockLogQueue>;
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    vi.clearAllMocks();
    reflector = new Reflector();
    logQueue = createMockLogQueue();
    interceptor = new AuditInterceptor(reflector, logQueue as never);
  });

  describe('audit logging on success', () => {
    it('logs audit entry when handler has @AuditLog decorator', () => {
      const handler = function createProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'create' }, handler);

      const request = {
        method: 'POST',
        originalUrl: '/api/projects',
        url: '/api/projects',
        auth: { userId: 'user-1', tenantId: 'tenant-1' },
        traceId: 'trace-1',
        body: { name: 'Wedding' },
      };

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({ getRequest: () => request }),
      };

      const result = { id: 'proj-1', name: 'Wedding' };
      const callHandler = createMockCallHandler(result);

      let emitted: any;
      interceptor.intercept(context as any, callHandler as any).subscribe((val) => (emitted = val));

      expect(emitted).toEqual(result);
      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          entity: 'projects',
          entityId: 'proj-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          changes: { name: 'Wedding' },
        }),
      );
    });

    it('includes metadata with method, path, duration, and traceId', () => {
      const handler = function updateProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'update' }, handler);

      const request = {
        method: 'PATCH',
        originalUrl: '/api/projects/proj-1',
        url: '/api/projects/proj-1',
        auth: { userId: 'user-1', tenantId: 'tenant-1' },
        traceId: 'trace-2',
        body: { name: 'Updated' },
      };

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({ getRequest: () => request }),
      };

      const callHandler = createMockCallHandler({ id: 'proj-1' });

      interceptor.intercept(context as any, callHandler as any).subscribe();

      const auditData = logQueue.addAudit.mock.calls[0]![0];
      expect(auditData.metadata).toEqual(
        expect.objectContaining({
          method: 'PATCH',
          path: '/api/projects/proj-1',
          traceId: 'trace-2',
          duration: expect.any(Number),
        }),
      );
    });

    it('returns entityId as "unknown" when result has no id', () => {
      const handler = function createProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'create' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            originalUrl: '/api/projects',
            url: '/api/projects',
            auth: undefined,
            body: {},
          }),
        }),
      };

      const callHandler = createMockCallHandler({ success: true });

      interceptor.intercept(context as any, callHandler as any).subscribe();

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({ entityId: 'unknown' }),
      );
    });

    it('handles missing auth context gracefully', () => {
      const handler = function createProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'create' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            originalUrl: '/api/projects',
            url: '/api/projects',
            auth: undefined,
            body: {},
          }),
        }),
      };

      const callHandler = createMockCallHandler({ id: 'proj-1' });

      interceptor.intercept(context as any, callHandler as any).subscribe();

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
          tenantId: undefined,
        }),
      );
    });

    it('converts null tenantId to undefined', () => {
      const handler = function createProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'create' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            originalUrl: '/api/projects',
            url: '/api/projects',
            auth: { userId: 'user-1', tenantId: null },
            body: {},
          }),
        }),
      };

      const callHandler = createMockCallHandler({ id: 'proj-1' });

      interceptor.intercept(context as any, callHandler as any).subscribe();

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: undefined }),
      );
    });
  });

  describe('audit logging on error', () => {
    it('logs audit with ":failed" action suffix on error', () => {
      const handler = function deleteProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'delete' }, handler);

      const request = {
        method: 'DELETE',
        originalUrl: '/api/projects/proj-1',
        url: '/api/projects/proj-1',
        auth: { userId: 'user-1', tenantId: 'tenant-1' },
        traceId: 'trace-3',
        body: {},
      };

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({ getRequest: () => request }),
      };

      const error = new Error('not found');
      const callHandler = createMockCallHandler(undefined, error);

      let caught: any;
      interceptor.intercept(context as any, callHandler as any).subscribe({
        error: (err: any) => (caught = err),
      });

      expect(caught).toBe(error);
      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete:failed',
          entity: 'projects',
          metadata: expect.objectContaining({
            error: 'not found',
          }),
        }),
      );
    });

    it('includes error message in metadata for Error instances', () => {
      const handler = function updateProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'update' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'PATCH',
            originalUrl: '/api/projects/proj-1',
            url: '/api/projects/proj-1',
            auth: undefined,
            body: {},
          }),
        }),
      };

      const error = new Error('validation failed');
      const callHandler = createMockCallHandler(undefined, error);

      interceptor.intercept(context as any, callHandler as any).subscribe({ error: () => {} });

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error: 'validation failed' }),
        }),
      );
    });

    it('stringifies non-Error exceptions in metadata', () => {
      const handler = function updateProject() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'update' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'PATCH',
            originalUrl: '/api/projects/proj-1',
            url: '/api/projects/proj-1',
            auth: undefined,
            body: {},
          }),
        }),
      };

      const callHandler = {
        handle: vi.fn().mockReturnValue(throwError(() => 'string error')),
      };

      interceptor.intercept(context as any, callHandler as any).subscribe({ error: () => {} });

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error: 'string error' }),
        }),
      );
    });
  });

  describe('decorator metadata reading', () => {
    it('passes through without logging when no @AuditLog decorator', () => {
      const handler = function noDecorator() {};
      // No metadata defined

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ProjectsController' }),
        switchToHttp: () => ({
          getRequest: () => ({ method: 'GET', originalUrl: '/api/projects' }),
        }),
      };

      const callHandler = createMockCallHandler({ data: 'test' });

      let emitted: any;
      interceptor.intercept(context as any, callHandler as any).subscribe((val) => (emitted = val));

      expect(emitted).toEqual({ data: 'test' });
      expect(logQueue.addAudit).not.toHaveBeenCalled();
    });

    it('reads action from decorator metadata', () => {
      const handler = function doSomething() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'custom_action' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'ItemsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            originalUrl: '/api/items',
            url: '/api/items',
            auth: undefined,
            body: {},
          }),
        }),
      };

      const callHandler = createMockCallHandler({ id: 'item-1' });

      interceptor.intercept(context as any, callHandler as any).subscribe();

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'custom_action' }),
      );
    });

    it('extracts entity name from controller class name', () => {
      const handler = function create() {};
      Reflect.defineMetadata(AUDIT_LOG_KEY, { action: 'create' }, handler);

      const context = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue({ name: 'WeddingGuestsController' }),
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            originalUrl: '/api/guests',
            url: '/api/guests',
            auth: undefined,
            body: {},
          }),
        }),
      };

      const callHandler = createMockCallHandler({ id: 'g-1' });

      interceptor.intercept(context as any, callHandler as any).subscribe();

      expect(logQueue.addAudit).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'wedding_guests' }),
      );
    });
  });
});
