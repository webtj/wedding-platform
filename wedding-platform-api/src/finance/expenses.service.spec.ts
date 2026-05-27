import { describe, expect, it, vi } from 'vitest';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  it('creates a project expense in tenant scope', async () => {
    const prisma = { projectExpense: { create: vi.fn().mockResolvedValue({ id: 'expense_1' }) } };
    const audit = { record: vi.fn().mockResolvedValue({}) };
    const service = new ExpensesService(prisma as never, audit as never);

    await service.create({
      tenantId: 'tenant_1',
      userId: 'user_1',
      projectId: 'project_1',
      data: {
        category: 'floral',
        title: '花艺定金',
        amountCents: 1200000,
        spentAt: '2026-05-23T10:00:00.000Z'
      }
    });

    expect(prisma.projectExpense.create).toHaveBeenCalled();
  });
});
