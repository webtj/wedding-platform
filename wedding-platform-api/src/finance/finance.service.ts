import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function sum(values: Array<{ amountCents: number }>) {
  return values.reduce((total, item) => total + item.amountCents, 0);
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async projectSummary(input: { tenantId: string; projectId: string }) {
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      include: { payments: true }
    });
    const expenses = await this.prisma.projectExpense.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId }
    });
    const contractAmountCents = contracts.reduce((total, contract) => total + contract.amountCents, 0);
    const paidAmountCents = contracts.reduce((total, contract) => total + sum(contract.payments), 0);
    const expenseAmountCents = sum(expenses);
    return {
      contractAmountCents,
      paidAmountCents,
      receivableAmountCents: Math.max(contractAmountCents - paidAmountCents, 0),
      expenseAmountCents,
      grossProfitCents: paidAmountCents - expenseAmountCents
    };
  }

  async tenantSummary(input: { tenantId: string }) {
    const contracts = await this.prisma.contract.findMany({
      where: { tenantId: input.tenantId },
      include: { payments: true }
    });
    const expenses = await this.prisma.projectExpense.findMany({
      where: { tenantId: input.tenantId }
    });
    const contractAmountCents = contracts.reduce((total, contract) => total + contract.amountCents, 0);
    const paidAmountCents = contracts.reduce((total, contract) => total + sum(contract.payments), 0);
    const expenseAmountCents = sum(expenses);
    return {
      contractAmountCents,
      paidAmountCents,
      receivableAmountCents: Math.max(contractAmountCents - paidAmountCents, 0),
      expenseAmountCents,
      grossProfitCents: paidAmountCents - expenseAmountCents
    };
  }
}
