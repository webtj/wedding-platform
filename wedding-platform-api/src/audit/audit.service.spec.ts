import { describe, expect, it, vi } from 'vitest';
import { AuditService } from './audit.service';

function makePrisma() {
  return {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn()
    }
  };
}

describe('AuditService', () => {
  describe('record', () => {
    it('persists a row without metadata when metadata is omitted', async () => {
      const prisma = makePrisma();
      prisma.auditLog.create.mockResolvedValue({ id: 'audit_1' });
      const service = new AuditService(prisma as never);

      await service.record({
        tenantId: 't1',
        userId: 'u1',
        action: 'lead.create',
        entity: 'lead',
        entityId: 'lead_1'
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 't1',
          userId: 'u1',
          action: 'lead.create',
          entity: 'lead',
          entityId: 'lead_1'
        }
      });
    });

    it('includes metadata when provided', async () => {
      const prisma = makePrisma();
      prisma.auditLog.create.mockResolvedValue({ id: 'audit_2' });
      const service = new AuditService(prisma as never);

      await service.record({
        tenantId: 't1',
        userId: 'u1',
        action: 'lead.convert',
        entity: 'project',
        entityId: 'project_1',
        metadata: { leadId: 'lead_1', projectId: 'project_1' }
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: 't1',
          userId: 'u1',
          action: 'lead.convert',
          entity: 'project',
          entityId: 'project_1',
          metadata: { leadId: 'lead_1', projectId: 'project_1' }
        }
      });
    });
  });

  describe('list', () => {
    it('queries by tenant only when no projectId', async () => {
      const prisma = makePrisma();
      prisma.auditLog.findMany.mockResolvedValue([]);
      const service = new AuditService(prisma as never);

      await service.list({ tenantId: 't1' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    });

    it('filters by metadata.projectId when projectId is provided', async () => {
      const prisma = makePrisma();
      prisma.auditLog.findMany.mockResolvedValue([]);
      const service = new AuditService(prisma as never);

      await service.list({ tenantId: 't1', projectId: 'p1' });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 't1',
          metadata: { path: ['projectId'], equals: 'p1' }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
    });
  });
});
