import { Injectable } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConversionFunnel(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
    }

    const counts = await this.prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    });

    const statusOrder: LeadStatus[] = [
      LeadStatus.new,
      LeadStatus.contacted,
      LeadStatus.quoted,
      LeadStatus.negotiating,
      LeadStatus.won,
      LeadStatus.lost
    ];

    return statusOrder.map((status) => ({
      status,
      count: counts.find((c) => c.status === status)?._count.id ?? 0
    }));
  }

  async getLeadsBySource(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
    }

    const counts = await this.prisma.lead.groupBy({
      by: ['sourceChannel'],
      where,
      _count: { id: true }
    });

    return counts.map((c) => ({
      source: c.sourceChannel,
      count: c._count.id
    }));
  }

  async getLeadsByTime(tenantId: string, startDate?: Date, endDate?: Date, granularity: 'day' | 'week' = 'day') {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"tenantId" = ${tenantId}`,
    ];
    if (startDate) conditions.push(Prisma.sql`"createdAt" >= ${startDate}`);
    if (endDate) conditions.push(Prisma.sql`"createdAt" <= ${endDate}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    // PostgreSQL DATE_TRUNC('week', ...) uses Monday as week start (ISO 8601)
    const truncExpr = granularity === 'week'
      ? Prisma.sql`DATE_TRUNC('week', "createdAt")`
      : Prisma.sql`DATE_TRUNC('day', "createdAt")`;

    const rows = await this.prisma.$queryRaw<
      { date: Date; total: bigint; won: bigint }[]
    >(Prisma.sql`
      SELECT
        ${truncExpr} AS date,
        COUNT(*)::bigint AS total,
        (COUNT(*) FILTER (WHERE status = ${LeadStatus.won}::"LeadStatus"))::bigint AS won
      FROM leads
      ${whereClause}
      GROUP BY ${truncExpr}
      ORDER BY date ASC
    `);

    return rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      total: Number(r.total),
      won: Number(r.won),
    }));
  }

  async getConversionRate(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: Record<string, unknown> = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = startDate;
      if (endDate) (where.createdAt as Record<string, unknown>).lte = endDate;
    }

    const [total, won] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.won } })
    ]);

    return {
      total,
      won,
      rate: total > 0 ? Math.round((won / total) * 10000) / 100 : 0
    };
  }

  async getAverageConversionTime(tenantId: string, startDate?: Date, endDate?: Date) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"tenantId" = ${tenantId}`,
      Prisma.sql`status = ${LeadStatus.won}::"LeadStatus"`,
      Prisma.sql`"convertedAt" IS NOT NULL`,
    ];
    if (startDate) conditions.push(Prisma.sql`"createdAt" >= ${startDate}`);
    if (endDate) conditions.push(Prisma.sql`"createdAt" <= ${endDate}`);

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    const [result] = await this.prisma.$queryRaw<
      { avgDays: number | null; sampleSize: bigint }[]
    >(Prisma.sql`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("convertedAt" - "createdAt")) / 86400.0) AS "avgDays",
        COUNT(*)::bigint AS "sampleSize"
      FROM leads
      ${whereClause}
    `);

    const sampleSize = Number(result?.sampleSize ?? 0);
    return {
      avgDays: sampleSize > 0 ? Math.round((result?.avgDays ?? 0) * 10) / 10 : 0,
      sampleSize,
    };
  }

  async getOverview(tenantId: string, startDate?: Date, endDate?: Date) {
    const [funnel, bySource, conversionRate, avgTime] = await Promise.all([
      this.getConversionFunnel(tenantId, startDate, endDate),
      this.getLeadsBySource(tenantId, startDate, endDate),
      this.getConversionRate(tenantId, startDate, endDate),
      this.getAverageConversionTime(tenantId, startDate, endDate)
    ]);

    return {
      funnel,
      bySource,
      conversionRate,
      avgConversionTime: avgTime
    };
  }
}
