import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { archiveProjectSchema, completeProjectSchema } from './dto';
import { ArchiveService } from './archive.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects/:projectId')
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Post('complete')
  complete(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.archiveService.completeProject({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: completeProjectSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_ARCHIVE)
  @Post('archive')
  archive(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.archiveService.archiveProject({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: archiveProjectSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get('archive-summary')
  summary(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.archiveService.summary({ tenantId: tenant.tenantId, projectId });
  }
}
