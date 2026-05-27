import { describe, expect, it, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('records a tenant scoped action', async () => {
    const prisma = { auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit_1' }) } };
    const service = new AuditService(prisma as never);

    await service.record({
      tenantId: 'tenant_1',
      userId: 'user_1',
      action: 'lead.create',
      entity: 'lead',
      entityId: 'lead_1'
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        userId: 'user_1',
        action: 'lead.create',
        entity: 'lead',
        entityId: 'lead_1'
      }
    });
  });
});
