import { describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../common/exceptions/business.exception';
import { NavBadgesController } from './nav-badges.controller';

describe('NavBadgesController', () => {
  it('returns tenant-scoped badges for a regular tenant user', () => {
    const service = { getAll: vi.fn().mockReturnValue({ badges: { 'leads-needs-followup': { count: 4 } } }) };
    const controller = new NavBadgesController(service as never);

    const result = controller.get({
      auth: {
        userId: 'u1',
        tenantId: 'tenant_1',
        memberId: 'm1',
        isPlatformAdmin: false,
        permissions: []
      }
    });

    expect(service.getAll).toHaveBeenCalledWith('tenant_1');
    expect(result).toEqual({ badges: { 'leads-needs-followup': { count: 4 } } });
  });

  it('returns an empty badge map for platform admins (no tenant context)', () => {
    const service = { getAll: vi.fn() };
    const controller = new NavBadgesController(service as never);

    const result = controller.get({
      auth: {
        userId: 'u1',
        tenantId: null,
        memberId: null,
        isPlatformAdmin: true,
        platformLevel: 'super',
        permissions: []
      }
    });

    expect(service.getAll).not.toHaveBeenCalled();
    expect(result).toEqual({ badges: {} });
  });

  it('returns an empty badge map for tenant-scoped platform admins (acting as tenant)', () => {
    // A platform admin who is also a member of a tenant has tenantId set;
    // the badge map is computed normally for that tenant.
    const service = { getAll: vi.fn().mockReturnValue({ badges: {} }) };
    const controller = new NavBadgesController(service as never);

    const result = controller.get({
      auth: {
        userId: 'u1',
        tenantId: 'tenant_1',
        memberId: 'm1',
        isPlatformAdmin: true,
        platformLevel: 'super',
        permissions: []
      }
    });

    expect(service.getAll).toHaveBeenCalledWith('tenant_1');
    expect(result).toEqual({ badges: {} });
  });

  it('throws TENANT_REQUIRED for an unauthenticated request', () => {
    const service = { getAll: vi.fn() };
    const controller = new NavBadgesController(service as never);

    expect(() => controller.get({})).toThrow(BusinessException);
    expect(() => controller.get({})).toThrow('请先选择工作空间');
  });
});
