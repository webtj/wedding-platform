import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createProjectStageSchema, updateProjectStageSchema } from './dto';
import { ProjectStagesService } from './project-stages.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ProjectStagesController {
  constructor(private readonly projectStagesService: ProjectStagesService) {}

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get('projects/:projectId/stages')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.projectStagesService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Post('projects/:projectId/stages')
  create(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.projectStagesService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createProjectStageSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Patch('project-stages/:stageId')
  update(@Req() request: { auth?: AuthContext }, @Param('stageId') stageId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.projectStagesService.update({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      stageId,
      data: updateProjectStageSchema.parse(body)
    });
  }
}
