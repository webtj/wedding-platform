import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
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
  list(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.projectsService.listForUser({
      tenantId: tenant.tenantId,
      userId: tenant.userId
    });
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

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Post(':projectId/couple-invitations')
  createInvitation(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.projectsService.createInvitation({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createCoupleInvitationSchema.parse(body)
    });
  }

  @Post('invitations/:token/accept')
  acceptInvitation(@Req() request: { auth?: AuthContext }, @Param('token') token: string) {
    if (!request.auth?.userId) {
      throw new UnauthorizedException('Missing user');
    }
    return this.projectsService.acceptInvitation({
      userId: request.auth.userId,
      token
    });
  }
}
