import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(input: { tenantId: string }) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [leadCount, activeProjectCount, monthContractCount, receivable] =
      await Promise.all([
        this.prisma.lead.count({
          where: { tenantId: input.tenantId }
        }),
        this.prisma.project.count({
          where: { tenantId: input.tenantId, status: 'active' }
        }),
        this.prisma.contract.count({
          where: {
            tenantId: input.tenantId,
            createdAt: { gte: monthStart }
          }
        }),
        this.prisma.contract
          .count({
            where: {
              tenantId: input.tenantId,
              status: 'signed',
              createdAt: { gte: monthStart }
            }
          })
          .then(() => 0)
      ]);

    return {
      leadCount,
      activeProjectCount,
      monthContractCount,
      receivableCents: receivable
    };
  }

  async getTrends(input: { tenantId: string }) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentLeads, prevLeads, currentContracts, prevContracts] = await Promise.all([
      this.prisma.lead.count({
        where: { tenantId: input.tenantId, createdAt: { gte: monthStart } }
      }),
      this.prisma.lead.count({
        where: { tenantId: input.tenantId, createdAt: { gte: prevMonthStart, lt: monthStart } }
      }),
      this.prisma.contract.count({
        where: { tenantId: input.tenantId, createdAt: { gte: monthStart } }
      }),
      this.prisma.contract.count({
        where: { tenantId: input.tenantId, createdAt: { gte: prevMonthStart, lt: monthStart } }
      })
    ]);

    const pctChange = (current: number, prev: number) =>
      prev === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - prev) / prev) * 10000) / 100;

    return {
      currentMonthLeads: currentLeads,
      prevMonthLeads: prevLeads,
      leadsChangePct: pctChange(currentLeads, prevLeads),
      currentMonthContracts: currentContracts,
      prevMonthContracts: prevContracts,
      contractsChangePct: pctChange(currentContracts, prevContracts)
    };
  }
}
