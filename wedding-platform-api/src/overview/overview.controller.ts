import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { OverviewService } from './overview.service';

@UseGuards(JwtAuthGuard)
@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('stats')
  stats(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.overviewService.getStats({ tenantId: tenant.tenantId });
  }

  @Get('trends')
  trends(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.overviewService.getTrends({ tenantId: tenant.tenantId });
  }
}
