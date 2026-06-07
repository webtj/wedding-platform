import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { AiMetricsService } from './ai-metrics.service';

@Controller('ai-usage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiMetricsController {
  constructor(private readonly metricsService: AiMetricsService) {}

  @Get('metrics')
  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  async getMetrics(
    @Req() request: { auth?: { isPlatformAdmin?: boolean; tenantId?: string | null } },
    @Query('startDate') _startDate?: string,
    @Query('endDate') _endDate?: string
  ) {
    // Platform admin → null tenantId → service aggregates across all tenants.
    // Tenant user → scoped to their tenantId.
    const tenantId = request.auth?.isPlatformAdmin ? null : request.auth?.tenantId ?? null;
    return this.metricsService.getSummary(tenantId, 30);
  }
}
