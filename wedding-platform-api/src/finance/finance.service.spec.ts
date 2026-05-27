import { describe, expect, it, vi } from 'vitest';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  it('calculates project finance summary', async () => {
    const prisma = {
      contract: {
        findMany: vi.fn().mockResolvedValue([
          { amountCents: 10000, payments: [{ amountCents: 4000 }, { amountCents: 1000 }] }
        ])
      },
      projectExpense: {
        findMany: vi.fn().mockResolvedValue([{ amountCents: 1500 }])
      }
    };
    const service = new FinanceService(prisma as never);

    const summary = await service.projectSummary({ tenantId: 'tenant_1', projectId: 'project_1' });

    expect(summary).toEqual({
      contractAmountCents: 10000,
      paidAmountCents: 5000,
      receivableAmountCents: 5000,
      expenseAmountCents: 1500,
      grossProfitCents: 3500
    });
  });
});
