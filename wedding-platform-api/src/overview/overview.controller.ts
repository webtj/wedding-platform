import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { OverviewService } from './overview.service';

@UseGuards(JwtAuthGuard)
@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('stats')
  stats(@Req() request: { auth?: AuthContext }) {
    const tenantId = request.auth?.tenantId;
    if (!tenantId) {
      return { leadCount: 0, activeProjectCount: 0, monthContractCount: 0, receivableCents: 0 };
    }
    return this.overviewService.getStats({ tenantId });
  }

  @Get('trends')
  trends(@Req() request: { auth?: AuthContext }) {
    const tenantId = request.auth?.tenantId;
    if (!tenantId) {
      return { currentMonthLeads: 0, prevMonthLeads: 0, leadsChangePct: 0, currentMonthContracts: 0, prevMonthContracts: 0, contractsChangePct: 0 };
    }
    return this.overviewService.getTrends({ tenantId });
  }
}
