import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { MiniProjectsService } from './mini-projects.service';

@UseGuards(JwtAuthGuard)
@Controller('mini')
export class MiniController {
  constructor(private readonly miniProjectsService: MiniProjectsService) {}

  @Get('me')
  me(@Req() request: { auth?: AuthContext }) { const tenant = requireTenant(request.auth); return { userId: tenant.userId, tenantId: tenant.tenantId, memberId: tenant.memberId }; }

  @Get('projects')
  projects(@Req() request: { auth?: AuthContext }) { const tenant = requireTenant(request.auth); return this.miniProjectsService.listForUser({ tenantId: tenant.tenantId, userId: tenant.userId }); }

  @Get('projects/:projectId/summary')
  summary(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) { const tenant = requireTenant(request.auth); return this.miniProjectsService.summary({ tenantId: tenant.tenantId, userId: tenant.userId, projectId }); }
}
