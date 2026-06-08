import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import {
  queryRequestLogsSchema,
  queryErrorLogsSchema,
  queryAuditLogsSchema,
  queryEventLogsSchema,
  statsDateRangeSchema,
} from './dto/query-logs.dto';
import { LogService } from './log.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  // ── List endpoints ─────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('requests')
  queryRequestLogs(@Query() query: Record<string, string>) {
    return this.logService.queryRequestLogs(queryRequestLogsSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('errors')
  queryErrorLogs(@Query() query: Record<string, string>) {
    return this.logService.queryErrorLogs(queryErrorLogsSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('audits')
  queryAuditLogs(@Query() query: Record<string, string>) {
    return this.logService.queryAuditLogs(queryAuditLogsSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('events')
  queryEventLogs(@Query() query: Record<string, string>) {
    return this.logService.queryEventLogs(queryEventLogsSchema.parse(query));
  }

  // ── Stats endpoints ────────────────────────────────────────────────────────

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('stats/overview')
  getOverviewStats(@Query() query: Record<string, string>) {
    return this.logService.getOverviewStats(statsDateRangeSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('stats/errors-by-day')
  getErrorsByDay(@Query() query: Record<string, string>) {
    return this.logService.getErrorsByDay(statsDateRangeSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('stats/requests-by-hour')
  getRequestsByHour(@Query() query: Record<string, string>) {
    return this.logService.getRequestsByHour(statsDateRangeSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('stats/top-errors')
  getTopErrors(@Query() query: Record<string, string>) {
    return this.logService.getTopErrors(statsDateRangeSchema.parse(query));
  }

  @RequirePermissions(PERMISSIONS.PLATFORM_LOG_READ)
  @Get('stats/slow-requests')
  getSlowRequests(@Query() query: Record<string, string>) {
    return this.logService.getSlowRequests(statsDateRangeSchema.parse(query));
  }
}
