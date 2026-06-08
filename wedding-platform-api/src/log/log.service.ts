import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  QueryRequestLogsDto,
  QueryErrorLogsDto,
  QueryAuditLogsDto,
  QueryEventLogsDto,
  StatsDateRangeDto,
} from './dto/query-logs.dto';

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Request logs ───────────────────────────────────────────────────────────

  async queryRequestLogs(dto: QueryRequestLogsDto) {
    const where: Prisma.LogRequestWhereInput = {};
    this.applyDateRange(where, dto.startDate, dto.endDate);
    if (dto.userId) where.userId = dto.userId;
    if (dto.tenantId) where.tenantId = dto.tenantId;
    if (dto.path) where.path = { contains: dto.path, mode: 'insensitive' };
    if (dto.statusCode) where.statusCode = dto.statusCode;
    if (dto.method) where.method = dto.method.toUpperCase();

    const skip = (dto.page - 1) * dto.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.logRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.pageSize,
      }),
      this.prisma.logRequest.count({ where }),
    ]);

    return { items, total, page: dto.page, pageSize: dto.pageSize };
  }

  // ── Error logs ─────────────────────────────────────────────────────────────

  async queryErrorLogs(dto: QueryErrorLogsDto) {
    const where: Prisma.LogErrorWhereInput = {};
    this.applyDateRange(where, dto.startDate, dto.endDate);
    if (dto.userId) where.userId = dto.userId;
    if (dto.tenantId) where.tenantId = dto.tenantId;
    if (dto.path) where.path = { contains: dto.path, mode: 'insensitive' };

    const skip = (dto.page - 1) * dto.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.logError.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.pageSize,
      }),
      this.prisma.logError.count({ where }),
    ]);

    return { items, total, page: dto.page, pageSize: dto.pageSize };
  }

  // ── Audit logs ─────────────────────────────────────────────────────────────

  async queryAuditLogs(dto: QueryAuditLogsDto) {
    const where: Prisma.LogAuditWhereInput = {};
    this.applyDateRange(where, dto.startDate, dto.endDate);
    if (dto.userId) where.userId = dto.userId;
    if (dto.tenantId) where.tenantId = dto.tenantId;
    if (dto.action) where.action = dto.action;
    if (dto.entity) where.entity = dto.entity;

    const skip = (dto.page - 1) * dto.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.logAudit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.pageSize,
      }),
      this.prisma.logAudit.count({ where }),
    ]);

    return { items, total, page: dto.page, pageSize: dto.pageSize };
  }

  // ── Behavior events ────────────────────────────────────────────────────────

  async queryEventLogs(dto: QueryEventLogsDto) {
    const where: Prisma.LogEventWhereInput = {};
    this.applyDateRange(where, dto.startDate, dto.endDate);
    if (dto.userId) where.userId = dto.userId;
    if (dto.tenantId) where.tenantId = dto.tenantId;
    if (dto.eventType) where.eventType = dto.eventType;
    if (dto.eventName) where.eventName = dto.eventName;

    const skip = (dto.page - 1) * dto.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.logEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.pageSize,
      }),
      this.prisma.logEvent.count({ where }),
    ]);

    return { items, total, page: dto.page, pageSize: dto.pageSize };
  }

  // ── Stats: overview ────────────────────────────────────────────────────────

  async getOverviewStats(dto: StatsDateRangeDto) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (dto.startDate) dateFilter.gte = dto.startDate;
    if (dto.endDate) dateFilter.lte = dto.endDate;
    const hasDateFilter = dto.startDate || dto.endDate;
    const requestWhere: Prisma.LogRequestWhereInput = hasDateFilter ? { createdAt: dateFilter } : {};
    const errorWhere: Prisma.LogErrorWhereInput = hasDateFilter ? { createdAt: dateFilter } : {};

    const [totalRequests, totalErrors, avgDuration] = await Promise.all([
      this.prisma.logRequest.count({ where: requestWhere }),
      this.prisma.logError.count({ where: errorWhere }),
      this.prisma.logRequest.aggregate({
        where: requestWhere,
        _avg: { duration: true },
      }),
    ]);

    return {
      totalRequests,
      totalErrors,
      avgDuration: Math.round(avgDuration._avg.duration ?? 0),
    };
  }

  // ── Stats: errors by day ───────────────────────────────────────────────────

  async getErrorsByDay(dto: StatsDateRangeDto) {
    const results = await this.prisma.$queryRaw<{ day: string; count: bigint }[]>`
      SELECT
        to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
        COUNT(*) AS count
      FROM log_errors
      WHERE "createdAt" >= COALESCE(${dto.startDate ?? null}::timestamptz, now() - interval '30 days')
        AND "createdAt" <= COALESCE(${dto.endDate ?? null}::timestamptz, now())
      GROUP BY day
      ORDER BY day
    `;

    return results.map((r) => ({ day: r.day, count: Number(r.count) }));
  }

  // ── Stats: requests by hour ────────────────────────────────────────────────

  async getRequestsByHour(dto: StatsDateRangeDto) {
    const results = await this.prisma.$queryRaw<{ hour: number; count: bigint }[]>`
      SELECT
        EXTRACT(HOUR FROM "createdAt")::int AS hour,
        COUNT(*) AS count
      FROM log_requests
      WHERE "createdAt" >= COALESCE(${dto.startDate ?? null}::timestamptz, now() - interval '7 days')
        AND "createdAt" <= COALESCE(${dto.endDate ?? null}::timestamptz, now())
      GROUP BY hour
      ORDER BY hour
    `;

    return results.map((r) => ({ hour: r.hour, count: Number(r.count) }));
  }

  // ── Stats: top errors ──────────────────────────────────────────────────────

  async getTopErrors(dto: StatsDateRangeDto) {
    const dateCondition = this.buildRawDateCondition(dto, 30);
    const results = await this.prisma.$queryRaw<{
      message: string;
      path: string | null;
      count: bigint;
    }[]>`
      SELECT
        message,
        path,
        COUNT(*) AS count
      FROM log_errors
      ${dateCondition}
      GROUP BY message, path
      ORDER BY count DESC
      LIMIT 10
    `;

    return results.map((r) => ({ message: r.message, path: r.path, count: Number(r.count) }));
  }

  // ── Stats: slow requests ───────────────────────────────────────────────────

  async getSlowRequests(dto: StatsDateRangeDto) {
    const dateCondition = this.buildRawDateCondition(dto, 7);
    const results = await this.prisma.$queryRaw<{
      method: string;
      path: string;
      avg_duration: number;
      max_duration: number;
      count: bigint;
    }[]>`
      SELECT
        method,
        path,
        ROUND(AVG(duration))::int AS avg_duration,
        MAX(duration)::int AS max_duration,
        COUNT(*) AS count
      FROM log_requests
      ${dateCondition}
      GROUP BY method, path
      ORDER BY avg_duration DESC
      LIMIT 10
    `;

    return results.map((r) => ({
      method: r.method,
      path: r.path,
      avgDuration: r.avg_duration,
      maxDuration: r.max_duration,
      count: Number(r.count),
    }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private applyDateRange(
    where: Record<string, unknown>,
    startDate?: Date,
    endDate?: Date,
  ): void {
    if (startDate || endDate) {
      const filter: Prisma.DateTimeFilter = {};
      if (startDate) filter.gte = startDate;
      if (endDate) filter.lte = endDate;
      where.createdAt = filter;
    }
  }

  private buildRawDateCondition(
    dto: StatsDateRangeDto,
    defaultDays: number,
  ): Prisma.Sql {
    const { startDate, endDate } = this.resolveDateRange(dto, defaultDays);

    return Prisma.sql`
      WHERE "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
    `;
  }

  private resolveDateRange(
    dto: StatsDateRangeDto,
    defaultDays: number,
  ): { startDate: Date; endDate: Date } {
    const now = dto.endDate ?? new Date();
    const startDate =
      dto.startDate ??
      new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    const endDate = dto.endDate ?? new Date();

    return { startDate, endDate };
  }
}
