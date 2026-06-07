import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException } from '../exceptions/business.exception';
import { PermissionsGuard } from './permissions.guard';

function buildContext({
  auth,
  controllerName,
  handlerName
}: {
  auth?: { isPlatformAdmin?: boolean; permissions?: string[] } | null;
  controllerName?: string;
  handlerName?: string;
}): ExecutionContext {
  return {
    getHandler: () => handlerName ?? 'handler',
    getClass: () => {
      if (!controllerName) return undefined as never;
      class Stub {
        static name = controllerName;
      }
      return Stub as never;
    },
    switchToHttp: () => ({
      getRequest: () => ({ auth: auth ?? null })
    })
  } as never;
}

describe('PermissionsGuard', () => {
  it('allows the request when no permissions are required', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as never;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext({}))).toBe(true);
  });

  it('throws PERMISSION_DENIED when request has no auth context', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['lead.read']) } as never;
    const guard = new PermissionsGuard(reflector);
    try {
      guard.canActivate(buildContext({ auth: null }));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessException);
      const be = err as BusinessException;
      expect(be.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(be.errorCode).toBe('PERMISSION_DENIED');
    }
  });

  it('bypasses all checks for platform admins', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['lead.read']) } as never;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(buildContext({ auth: { isPlatformAdmin: true } }))).toBe(true);
  });

  it('allows the request when all required permissions are granted', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['lead.read', 'lead.create']) } as never;
    const guard = new PermissionsGuard(reflector);
    const ok = guard.canActivate(
      buildContext({ auth: { permissions: ['lead.read', 'lead.create', 'project.read'] } })
    );
    expect(ok).toBe(true);
  });

  it('rejects when any required permission is missing and carries details (requiredPermissions + resource)', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['lead.read', 'lead.create']) } as never;
    const guard = new PermissionsGuard(reflector);

    try {
      guard.canActivate(
        buildContext({
          auth: { permissions: ['lead.read'] }, // missing lead.create
          controllerName: 'LeadsController'
        })
      );
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessException);
      const be = err as BusinessException;
      const body = be.getResponse() as { code: string; details?: { requiredPermissions?: string[]; resource?: string } };
      expect(be.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(body.code).toBe('PERMISSION_DENIED');
      expect(body.details?.requiredPermissions).toEqual(['lead.read', 'lead.create']);
      // Controller name "LeadsController" → strip Controller → "Leads" → humanized "Leads"
      expect(body.details?.resource).toBe('Leads');
    }
  });

  it('humanizes camelCase controller names: TeamAccountsController → "Team Accounts"', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['member.read']) } as never;
    const guard = new PermissionsGuard(reflector);
    try {
      guard.canActivate(
        buildContext({
          auth: { permissions: [] },
          controllerName: 'TeamAccountsController'
        })
      );
      expect.fail('should have thrown');
    } catch (err) {
      const be = err as BusinessException;
      const body = be.getResponse() as { details?: { resource?: string } };
      expect(body.details?.resource).toBe('Team Accounts');
    }
  });

  it('falls back to undefined resource when no controller class is present', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['x.read']) } as never;
    const guard = new PermissionsGuard(reflector);
    try {
      guard.canActivate(buildContext({ auth: { permissions: [] } }));
      expect.fail('should have thrown');
    } catch (err) {
      const be = err as BusinessException;
      const body = be.getResponse() as { details?: { resource?: string } };
      expect(body.details?.resource).toBeUndefined();
    }
  });
});
