import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { TeamService } from './team.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('team/members')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @RequirePermissions(PERMISSIONS.MEMBER_READ)
  @Get()
  list(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.teamService.listMembers({ tenantId: tenant.tenantId });
  }
}
