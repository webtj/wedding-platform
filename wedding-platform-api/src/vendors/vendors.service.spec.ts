import { describe, expect, it, vi } from 'vitest';
import { VendorsService } from './vendors.service';

describe('VendorsService', () => {
  it('creates vendor inside tenant boundary', async () => {
    const prisma = { vendorProfile: { create: vi.fn().mockResolvedValue({ id: 'vendor_1', tenantId: 'tenant_1', name: '花艺团队' }) } };
    const service = new VendorsService(prisma as never);
    const result = await service.create({ tenantId: 'tenant_1', userId: 'user_1', data: { name: '花艺团队', category: 'floral', city: '上海', tags: ['森系'] } });
    expect(result.id).toBe('vendor_1');
  });
});
