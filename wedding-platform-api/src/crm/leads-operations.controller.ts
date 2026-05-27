import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { LeadsOperationsService } from './leads-operations.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsOperationsController {
  constructor(private readonly leadsOperationsService: LeadsOperationsService) {}

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('pipeline')
  pipeline(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.leadsOperationsService.pipeline({ tenantId: tenant.tenantId });
  }

  @RequirePermissions(PERMISSIONS.LEAD_READ)
  @Get('followups/overdue')
  overdueFollowups(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.leadsOperationsService.overdueFollowups({ tenantId: tenant.tenantId });
  }
}
