import { describe, expect, it, vi } from 'vitest';
import { ContractsService } from './contracts.service';

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
        amountCents: 18800000
      }
    });

    expect(prisma.contract.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        projectId: 'project_1',
        contractNo: 'HT-001',
        title: '婚礼策划服务合同',
        amountCents: 18800000,
        signedAt: undefined,
        note: undefined
      }
    });
  });

  it('calculates contract item total', async () => {
    const prisma = {
      contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract_1', projectId: 'project_1' }) },
      contractItem: { create: vi.fn().mockResolvedValue({ id: 'item_1' }) }
    };
    const service = new ContractsService(prisma as never, { record: vi.fn() } as never);

    await service.addItem({
      tenantId: 'tenant_1',
      userId: 'user_1',
      contractId: 'contract_1',
      data: { name: '策划服务费', quantity: 2, unitPriceCents: 1000 }
    });

    expect(prisma.contractItem.create).toHaveBeenCalledWith({
      data: {
        contractId: 'contract_1',
        name: '策划服务费',
        quantity: 2,
        unitPriceCents: 1000,
        totalCents: 2000,
        note: undefined
      }
    });
  });
});
