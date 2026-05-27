import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('projects/:projectId/finance-summary')
  projectSummary(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.financeService.projectSummary({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.CONTRACT_READ)
  @Get('finance/tenant-summary')
  tenantSummary(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.financeService.tenantSummary({ tenantId: tenant.tenantId });
  }
}
