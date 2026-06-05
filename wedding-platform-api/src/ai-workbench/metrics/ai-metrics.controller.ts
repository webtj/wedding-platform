import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { getTenantContext } from '../../common/tenant-context';
import { AiMetricsService } from './ai-metrics.service';

@Controller('ai-usage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AiMetricsController {
  constructor(private readonly metricsService: AiMetricsService) {}

  @Get('metrics')
  @RequirePermissions(PERMISSIONS.AI_GENERATION_READ)
  async getMetrics(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { tenantId } = getTenantContext(request);
    return this.metricsService.getSummary(tenantId!, 30);
  }
}
