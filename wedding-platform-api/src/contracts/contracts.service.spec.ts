import { describe, expect, it, vi } from 'vitest';
import { ContractsService } from './contracts.service';
import { AppError } from '../common/errors/app-error';

describe('ContractsService', () => {
  it('creates a tenant scoped contract', async () => {
    const prisma = { contract: { create: vi.fn().mockResolvedValue({ id: 'contract_1' }) } };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new ContractsService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: {
        contractNo: 'HT-001',
        title: '婚礼策划服务合同',
        serviceContent: '婚礼策划服务'
      }
    });

    expect(prisma.contract.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        contractNo: 'HT-001',
        title: '婚礼策划服务合同',
        serviceContent: '婚礼策划服务',
        note: undefined
      }
    });
  });

  describe('list', () => {
    it('queries contracts scoped by tenant and project, ordered by createdAt desc', async () => {
      const prisma = { contract: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await service.list({ tenantId: 't1', projectId: 'p1' });
      expect(prisma.contract.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1', projectId: 'p1' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('recent', () => {
    it('returns the 5 most recent contracts in the tenant with project/lead joins', async () => {
      const prisma = { contract: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await service.recent({ tenantId: 't1' });
      expect(prisma.contract.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't1' },
        include: expect.objectContaining({
          project: expect.any(Object),
          lead: expect.any(Object)
        }),
        orderBy: { createdAt: 'desc' },
        take: 5
      });
    });
  });

  describe('listAll', () => {
    it('paginates with no extra filters', async () => {
      const prisma = {
        contract: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      const result = await service.listAll({ tenantId: 't1' });
      expect(prisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1' },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10
        })
      );
      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
    });

    it('applies status and search filters', async () => {
      const prisma = {
        contract: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(2) }
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await service.listAll({ tenantId: 't1', status: 'signed', search: '婚礼', page: 2, pageSize: 5 });
      expect(prisma.contract.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 't1',
            status: 'signed',
            OR: [
              { contractNo: { contains: '婚礼' } },
              { title: { contains: '婚礼' } }
            ]
          },
          skip: 5,
          take: 5
        })
      );
    });
  });

  describe('getById', () => {
    it('returns the contract with project select', async () => {
      const contract = { id: 'c1', project: { id: 'p1' } };
      const prisma = { contract: { findFirst: vi.fn().mockResolvedValue(contract) } };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      const result = await service.getById({ tenantId: 't1', contractId: 'c1' });
      expect(result).toEqual(contract);
    });

    it('throws NotFound when contract does not exist', async () => {
      const prisma = { contract: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.getById({ tenantId: 't1', contractId: 'missing' })
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('update', () => {
    it('updates a contract with date fields coerced to Date', async () => {
      const prisma = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1', projectId: 'p1' }),
          update: vi.fn().mockResolvedValue({ id: 'c1' })
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ContractsService(prisma as never, audit as never);

      await service.update({
        tenantId: 't1',
        userId: 'u1',
        contractId: 'c1',
        data: { title: '新合同', weddingDate: '2026-10-10', signedAt: '2026-10-11' }
      });

      expect(prisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'c1', tenantId: 't1' },
        data: {
          title: '新合同',
          weddingDate: expect.any(Date),
          signedAt: expect.any(Date)
        }
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.update', entityId: 'c1' })
      );
    });

    it('throws NotFound when contract does not exist', async () => {
      const prisma = { contract: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await expect(
        service.update({ tenantId: 't1', userId: 'u1', contractId: 'missing', data: {} })
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('sign token lifecycle', () => {
    it('getBySignToken rejects expired token', async () => {
      const prisma = {
        contract: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'c1',
            signTokenExpiresAt: new Date(Date.now() - 1000)
          })
        }
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await expect(service.getBySignToken('tok')).rejects.toThrow('签署链接已过期');
    });

    it('sign flips status to signed with signatureData and timestamp', async () => {
      const prisma = {
        contract: {
          findUnique: vi.fn().mockResolvedValue({ id: 'c1', signTokenExpiresAt: null }),
          update: vi.fn().mockResolvedValue({ id: 'c1', status: 'signed' })
        }
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      const result = await service.sign('tok', 'signature-blob');
      expect(result).toEqual({ id: 'c1', status: 'signed' });
      expect(prisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'signed', signedAt: expect.any(Date), signatureData: 'signature-blob' }
      });
    });

    it('reject marks contract as voided with reason and timestamp', async () => {
      const prisma = {
        contract: {
          findUnique: vi.fn().mockResolvedValue({ id: 'c1', signTokenExpiresAt: null }),
          update: vi.fn().mockResolvedValue({ id: 'c1', status: 'voided' })
        }
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await service.reject('tok', '客户改主意了');
      expect(prisma.contract.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { status: 'voided', rejectedAt: expect.any(Date), rejectReason: '客户改主意了' }
      });
    });
  });

  describe('reissueSignToken', () => {
    it('generates a new token with 7 day expiry and writes audit log', async () => {
      const prisma = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1' }),
          update: vi.fn().mockResolvedValue({ id: 'c1', signToken: 'newtok' })
        }
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ContractsService(prisma as never, audit as never);

      await service.reissueSignToken({ tenantId: 't1', userId: 'u1', contractId: 'c1' });

      const updateCall = prisma.contract.update.mock.calls[0]![0];
      expect(updateCall.data.signToken).toMatch(/^[a-f0-9]{64}$/);
      expect(updateCall.data.signTokenExpiresAt).toBeInstanceOf(Date);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.reissue_sign_token' })
      );
    });
  });

  describe('delete', () => {
    it('deletes the contract and returns a deleted marker', async () => {
      const prisma = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      const result = await service.delete({ tenantId: 't1', contractId: 'c1' });
      expect(result).toEqual({ id: 'c1', deleted: true });
      expect(prisma.contract.delete).toHaveBeenCalledWith({ where: { id: 'c1', tenantId: 't1' } });
    });
  });

  describe('void', () => {
    it('clears the linked lead status and deletes the contract in a transaction', async () => {
      const tx = {
        lead: { update: vi.fn().mockResolvedValue({}) },
        contract: { delete: vi.fn().mockResolvedValue({}) }
      };
      const prisma = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1', leadId: 'l1' })
        },
        $transaction: vi.fn((cb: (tx: typeof tx) => unknown) => cb(tx))
      };
      const audit = { record: vi.fn().mockResolvedValue({}) };
      const service = new ContractsService(prisma as never, audit as never);

      await service.void({ tenantId: 't1', userId: 'u1', contractId: 'c1' });

      expect(tx.lead.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: { contractId: null, status: 'lost', lostReason: '合同已撤销' }
      });
      expect(tx.contract.delete).toHaveBeenCalledWith({ where: { id: 'c1', tenantId: 't1' } });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'contract.void', entityId: 'c1' })
      );
    });

    it('skips lead update when contract has no linked lead', async () => {
      const tx = {
        lead: { update: vi.fn() },
        contract: { delete: vi.fn().mockResolvedValue({}) }
      };
      const prisma = {
        contract: {
          findFirst: vi.fn().mockResolvedValue({ id: 'c1', leadId: null })
        },
        $transaction: vi.fn((cb: (tx: typeof tx) => unknown) => cb(tx))
      };
      const service = new ContractsService(prisma as never, { record: vi.fn() } as never);
      await service.void({ tenantId: 't1', userId: 'u1', contractId: 'c1' });
      expect(tx.lead.update).not.toHaveBeenCalled();
      expect(tx.contract.delete).toHaveBeenCalled();
    });
  });
});
