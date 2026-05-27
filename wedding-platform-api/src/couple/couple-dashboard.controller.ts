import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { CoupleDashboardService } from './couple-dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('couple')
export class CoupleDashboardController {
  constructor(private readonly coupleDashboardService: CoupleDashboardService) {}

  @Get('dashboard')
  dashboard(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.coupleDashboardService.dashboard({ tenantId: tenant.tenantId, userId: tenant.userId });
  }

  @Get('projects/:projectId/progress')
  progress(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.coupleDashboardService.progress({ tenantId: tenant.tenantId, userId: tenant.userId, projectId });
  }

  @Get('projects/:projectId/attention')
  attention(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.coupleDashboardService.attention({ tenantId: tenant.tenantId, userId: tenant.userId, projectId });
  }
}
