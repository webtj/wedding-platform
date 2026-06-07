import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../common/errors/app-error';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  it('creates a tenant-scoped lead and audit log', async () => {
    const prisma = {
      lead: {
        create: vi.fn().mockResolvedValue({ id: 'lead_1', tenantId: 'tenant_1' })
      }
    };
    const audit = { record: vi.fn().mockResolvedValue({ id: 'audit_1' }) };
    const service = new LeadsService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      data: { name: '李想', phone: '13800000000', sourceChannel: 'referral' as any }
    });

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        leadNo: expect.stringMatching(/^LD-[A-Z0-9]{8}-\d{8}$/),
        name: '李想',
        phone: '13800000000',
        sourceChannel: 'referral',
        weddingDate: undefined,
        note: undefined,
        createdByUserId: 'user_1'
      }
    });
    expect(audit.record).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      userId: 'user_1',
      action: 'lead.create',
      entity: 'lead',
      entityId: 'lead_1'
    });
  });

  it('lists leads only inside current tenant and excludes soft-deleted', async () => {
    const prisma = {
      lead: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0)
      }
    };
    const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

    await service.list({ tenantId: 'tenant_1' });

    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_1', deletedAt: null },
      include: {
        followups: { orderBy: { createdAt: 'desc' }, take: 1 },
        createdBy: { select: { displayName: true } },
        convertedProject: { select: { id: true } },
        contract: { select: { id: true, contractNo: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 10
    });
  });

  it('prevents changing status from won back to other statuses', async () => {
    const prisma = {
      lead: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'lead_1',
          tenantId: 'tenant_1',
          status: 'won'
        }),
        update: vi.fn()
      }
    };
    const audit = { record: vi.fn() };
    const service = new LeadsService(prisma as never, audit as never);

    await expect(
      service.update({
        tenantId: 'tenant_1',
        userId: 'user_1',
        leadId: 'lead_1',
        data: { status: 'contacted' as any }
      })
    ).rejects.toThrow(AppError);

    await expect(
      service.update({
        tenantId: 'tenant_1',
        userId: 'user_1',
        leadId: 'lead_1',
        data: { status: 'contacted' as any }
      })
    ).rejects.toThrow('Cannot change status of a won lead');

    expect(prisma.lead.update).not.toHaveBeenCalled();
  });

  it('allows keeping status as won when updating other fields', async () => {
    const prisma = {
      lead: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'lead_1',
          tenantId: 'tenant_1',
          status: 'won'
        }),
        update: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'won' })
      }
    };
    const audit = { record: vi.fn() };
    const service = new LeadsService(prisma as never, audit as never);

    await service.update({
      tenantId: 'tenant_1',
      userId: 'user_1',
      leadId: 'lead_1',
      data: { status: 'won' as any, note: 'updated note' }
    });

    expect(prisma.lead.update).toHaveBeenCalled();
  });

  it('soft deletes a lead instead of hard deleting', async () => {
    const prisma = {
      lead: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'lead_1',
          tenantId: 'tenant_1'
        }),
        update: vi.fn().mockResolvedValue({ id: 'lead_1' })
      }
    };
    const audit = { record: vi.fn() };
    const service = new LeadsService(prisma as never, audit as never);

    const result = await service.delete({ tenantId: 'tenant_1', leadId: 'lead_1' });

    expect(result).toEqual({ id: 'lead_1', deleted: true });
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead_1', tenantId: 'tenant_1' },
      data: { deletedAt: expect.any(Date) }
    });
  });

  it('get excludes soft-deleted leads', async () => {
    const prisma = {
      lead: {
        findFirst: vi.fn().mockResolvedValue(null)
      }
    };
    const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

    await expect(
      service.get({ tenantId: 'tenant_1', leadId: 'lead_deleted' })
    ).rejects.toThrow(AppError);

    expect(prisma.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'lead_deleted', tenantId: 'tenant_1', deletedAt: null },
      include: {
        followups: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { displayName: true } } }
        },
        createdBy: { select: { displayName: true } },
        convertedProject: { select: { id: true } },
        contract: { select: { id: true, contractNo: true } }
      }
    });
  });

  it('update persists changes when status guard does not trigger', async () => {
    const prisma = {
      lead: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'lead_1',
          tenantId: 'tenant_1',
          status: 'contacted'
        }),
        update: vi.fn().mockResolvedValue({ id: 'lead_1', note: 'updated' })
      }
    };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new LeadsService(prisma as never, audit as never);

    await service.update({
      tenantId: 'tenant_1',
      userId: 'user_1',
      leadId: 'lead_1',
      data: { note: 'updated' }
    });

    expect(prisma.lead.update).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'lead.update', entityId: 'lead_1' })
    );
  });

  describe('addFollowup', () => {
    it('creates a followup and auto-promotes new lead to contacted', async () => {
      const prisma = {
        lead: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({ id: 'lead_1', tenantId: 'tenant_1', status: 'new' })
            .mockResolvedValueOnce({ id: 'lead_1', tenantId: 'tenant_1', status: 'new' }),
          update: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'contacted' })
        },
        leadFollowup: {
          create: vi.fn().mockResolvedValue({ id: 'fu_1' })
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new LeadsService(prisma as never, audit as never);

      const result = await service.addFollowup({
        tenantId: 'tenant_1',
        userId: 'user_1',
        leadId: 'lead_1',
        data: { content: '客户已沟通' }
      });

      expect(result).toEqual({ id: 'fu_1' });
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'contacted' } })
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'lead.followup.create' })
      );
    });

    it('does not auto-promote a lead that is already past new', async () => {
      const prisma = {
        lead: {
          findFirst: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'contacted' }),
          update: vi.fn()
        },
        leadFollowup: {
          create: vi.fn().mockResolvedValue({ id: 'fu_1' })
        }
      };
      const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

      await service.addFollowup({
        tenantId: 'tenant_1',
        userId: 'user_1',
        leadId: 'lead_1',
        data: { content: '跟进' }
      });
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });
  });

  describe('createContract', () => {
    it('rejects when lead is not in won status', async () => {
      const prisma = {
        lead: { findFirst: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'contacted' }) }
      };
      const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

      await expect(
        service.createContract({
          tenantId: 't1',
          leadId: 'lead_1',
          data: { contractNo: 'HT-001', title: '服务合同' }
        })
      ).rejects.toThrow('Lead is not in won status');
    });

    it('rejects when lead already has a contract', async () => {
      const prisma = {
        lead: {
          findFirst: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'won', contractId: 'c_existing' })
        }
      };
      const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

      await expect(
        service.createContract({
          tenantId: 't1',
          leadId: 'lead_1',
          data: { contractNo: 'HT-001', title: '服务合同' }
        })
      ).rejects.toThrow('Lead already has a contract');
    });

    it('creates contract and links it to the lead in a transaction', async () => {
      const contract = { id: 'contract_1', contractNo: 'HT-001' };
      const tx = {
        contract: { create: vi.fn().mockResolvedValue(contract) },
        lead: { update: vi.fn().mockResolvedValue({}) }
      };
      const prisma = {
        lead: { findFirst: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'won', name: '李想' }) },
        tenant: { findUnique: vi.fn().mockResolvedValue({ name: '测试公司', address: '测试地址' }) },
        $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx))
      };
      const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

      const result = await service.createContract({
        tenantId: 't1',
        leadId: 'lead_1',
        data: { contractNo: 'HT-001', title: '服务合同' }
      });

      expect(result).toEqual(contract);
      expect(tx.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead_1' },
        data: { contractId: 'contract_1' }
      });
    });
  });

  describe('convert', () => {
    it('returns the existing project when lead is already won and converted', async () => {
      const existing = { id: 'project_existing' };
      const prisma = {
        lead: { findFirst: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'won', convertedProjectId: 'project_existing' }) },
        project: { findUniqueOrThrow: vi.fn().mockResolvedValue(existing) }
      };
      const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

      const result = await service.convert({
        tenantId: 't1',
        userId: 'u1',
        memberId: 'm1',
        leadId: 'lead_1',
        data: {} as never
      });

      expect(result).toEqual(existing);
      expect(prisma.project.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'project_existing' } });
    });

    it('creates a project, marks lead won, and writes an audit log in a transaction', async () => {
      const project = { id: 'project_new' };
      const tx = {
        project: { create: vi.fn().mockResolvedValue(project) },
        lead: { update: vi.fn().mockResolvedValue({}) },
        auditLog: { create: vi.fn().mockResolvedValue({}) }
      };
      const prisma = {
        lead: { findFirst: vi.fn().mockResolvedValue({ id: 'lead_1', status: 'contacted' }) },
        $transaction: vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx))
      };
      const service = new LeadsService(prisma as never, { record: vi.fn() } as never);

      const result = await service.convert({
        tenantId: 't1',
        userId: 'u1',
        memberId: 'm1',
        leadId: 'lead_1',
        data: {
          brideName: '新娘',
          groomName: '新郎',
          weddingDate: '2026-10-10',
          ceremonyType: 'traditional',
          guestCount: 100
        } as never
      });

      expect(result).toEqual(project);
      expect(tx.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'won', convertedProjectId: 'project_new' })
        })
      );
      expect(tx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'lead.convert' })
        })
      );
    });
  });
});
