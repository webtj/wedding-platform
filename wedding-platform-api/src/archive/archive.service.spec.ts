import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ArchiveService } from './archive.service';

function makePrisma() {
  return {
    project: {
      findFirst: vi.fn().mockResolvedValue({ id: 'project_1' }),
      update: vi.fn()
    }
  };
}

function makeAudit() {
  return { record: vi.fn().mockResolvedValue({}) };
}

describe('ArchiveService', () => {
  describe('completeProject', () => {
    it('marks project completed and writes audit log', async () => {
      const prisma = makePrisma();
      prisma.project.update.mockResolvedValue({ id: 'project_1', status: 'completed' });
      const audit = makeAudit();
      const service = new ArchiveService(prisma as never, audit as never);

      await service.completeProject({
        tenantId: 'tenant_1',
        userId: 'user_1',
        projectId: 'project_1',
        data: { note: '婚礼已完成' }
      });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project_1' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
          archiveNote: '婚礼已完成'
        }
      });
      expect(audit.record).toHaveBeenCalledWith({
        tenantId: 'tenant_1',
        userId: 'user_1',
        action: 'project.complete',
        entity: 'project',
        entityId: 'project_1',
        metadata: { projectId: 'project_1' }
      });
    });

    it('uses provided completedAt when given', async () => {
      const prisma = makePrisma();
      prisma.project.update.mockResolvedValue({});
      const service = new ArchiveService(prisma as never, makeAudit() as never);

      const fixed = new Date('2026-06-04T10:00:00Z');
      await service.completeProject({
        tenantId: 't1',
        userId: 'u1',
        projectId: 'p1',
        data: { completedAt: fixed.toISOString() }
      });

      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completedAt: fixed }) })
      );
    });

    it('throws NotFound when project is missing', async () => {
      const prisma = makePrisma();
      prisma.project.findFirst.mockResolvedValue(null);
      const service = new ArchiveService(prisma as never, makeAudit() as never);

      await expect(
        service.completeProject({ tenantId: 't1', userId: 'u1', projectId: 'p1', data: {} })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('archiveProject', () => {
    it('sets status completed, archivedAt, and writes audit log', async () => {
      const prisma = makePrisma();
      prisma.project.update.mockResolvedValue({ id: 'project_1', status: 'completed' });
      const audit = makeAudit();
      const service = new ArchiveService(prisma as never, audit as never);

      await service.archiveProject({
        tenantId: 't1',
        userId: 'u1',
        projectId: 'p1',
        data: { reason: '客户主动归档' }
      });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          status: 'completed',
          archivedAt: expect.any(Date),
          archiveNote: '客户主动归档'
        }
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'project.archive' })
      );
    });

    it('uses provided archivedAt when given', async () => {
      const prisma = makePrisma();
      prisma.project.update.mockResolvedValue({});
      const service = new ArchiveService(prisma as never, makeAudit() as never);

      const fixed = new Date('2026-01-15T00:00:00Z');
      await service.archiveProject({
        tenantId: 't1',
        userId: 'u1',
        projectId: 'p1',
        data: { archivedAt: fixed.toISOString() }
      });

      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ archivedAt: fixed }) })
      );
    });

    it('throws NotFound when project is missing', async () => {
      const prisma = makePrisma();
      prisma.project.findFirst.mockResolvedValue(null);
      const service = new ArchiveService(prisma as never, makeAudit() as never);

      await expect(
        service.archiveProject({ tenantId: 't1', userId: 'u1', projectId: 'p1', data: {} })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('summary', () => {
    it('returns the project with related counts and packages', async () => {
      const summary = { id: 'p1', _count: { assets: 5, tasks: 12, aiOutputs: 3, archivePackages: 1 } };
      const prisma = makePrisma();
      prisma.project.findFirst.mockResolvedValue(summary);
      const service = new ArchiveService(prisma as never, makeAudit() as never);

      const result = await service.summary({ tenantId: 't1', projectId: 'p1' });
      expect(result).toEqual(summary);
      expect(prisma.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1', tenantId: 't1' },
          include: expect.objectContaining({
            _count: expect.any(Object),
            retentionPolicy: true,
            archivePackages: { orderBy: { createdAt: 'desc' } }
          })
        })
      );
    });

    it('throws NotFound when project is missing', async () => {
      const prisma = makePrisma();
      prisma.project.findFirst.mockResolvedValue(null);
      const service = new ArchiveService(prisma as never, makeAudit() as never);

      await expect(
        service.summary({ tenantId: 't1', projectId: 'p1' })
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
