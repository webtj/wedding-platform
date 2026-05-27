import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProjectExpenseDto, UpdateProjectExpenseDto } from './dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  list(input: { tenantId: string; projectId: string }) {
    return this.prisma.projectExpense.findMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      orderBy: { spentAt: 'desc' }
    });
  }

  async create(input: { tenantId: string; userId: string; projectId: string; data: CreateProjectExpenseDto }) {
    const expense = await this.prisma.projectExpense.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        category: input.data.category,
        title: input.data.title,
        amountCents: input.data.amountCents,
        spentAt: new Date(input.data.spentAt),
        note: input.data.note,
        voucherAssetId: input.data.voucherAssetId
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'expense.create',
      entity: 'project_expense',
      entityId: expense.id,
      metadata: { projectId: input.projectId }
    });
    return expense;
  }

  async update(input: { tenantId: string; userId: string; expenseId: string; data: UpdateProjectExpenseDto }) {
    const expense = await this.prisma.projectExpense.findFirst({ where: { id: input.expenseId, tenantId: input.tenantId } });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    const updated = await this.prisma.projectExpense.update({
      where: { id: input.expenseId, tenantId: input.tenantId },
      data: {
        ...input.data,
        spentAt: input.data.spentAt ? new Date(input.data.spentAt) : undefined
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'expense.update',
      entity: 'project_expense',
      entityId: input.expenseId,
      metadata: { projectId: expense.projectId }
    });
    return updated;
  }
}
