import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createCoupleInvitationSchema } from './dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const { tenantId } = requireTenant(request.auth);
    return this.projectsService.listForUser({
      tenantId,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get(':projectId/timeline')
  getProjectTimeline(
    @Req() request: { auth?: AuthContext },
    @Param('projectId') projectId: string,
  ) {
    const tenant = requireTenant(request.auth);
    return this.projectsService.getProjectTimeline(tenant.tenantId, projectId);
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get(':projectId')
  get(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.projectsService.get({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId
    });
  }

}
