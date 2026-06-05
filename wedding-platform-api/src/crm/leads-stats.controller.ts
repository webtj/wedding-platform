import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { LeadsStatsService } from './leads-stats.service';

const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  granularity: z.enum(['day', 'week']).default('day')
});

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('crm/stats')
export class LeadsStatsController {
  constructor(private readonly statsService: LeadsStatsService) {}

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('overview')
  overview(@Req() request: { auth?: AuthContext }, @Query() query: Record<string, string>) {
    const tenant = requireTenant(request.auth);
    const params = dateRangeSchema.parse(query);
    return this.statsService.getOverview(tenant.tenantId, params.startDate, params.endDate);
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('funnel')
  funnel(@Req() request: { auth?: AuthContext }, @Query() query: Record<string, string>) {
    const tenant = requireTenant(request.auth);
    const params = dateRangeSchema.parse(query);
    return this.statsService.getConversionFunnel(tenant.tenantId, params.startDate, params.endDate);
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('by-source')
  bySource(@Req() request: { auth?: AuthContext }, @Query() query: Record<string, string>) {
    const tenant = requireTenant(request.auth);
    const params = dateRangeSchema.parse(query);
    return this.statsService.getLeadsBySource(tenant.tenantId, params.startDate, params.endDate);
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('timeline')
  timeline(@Req() request: { auth?: AuthContext }, @Query() query: Record<string, string>) {
    const tenant = requireTenant(request.auth);
    const params = dateRangeSchema.parse(query);
    return this.statsService.getLeadsByTime(
      tenant.tenantId,
      params.startDate,
      params.endDate,
      params.granularity
    );
  }
}
