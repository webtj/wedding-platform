import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createArchivePackageSchema } from './dto';
import { ArchivePackagesService } from './archive-packages.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ArchivePackagesController {
  constructor(private readonly archivePackagesService: ArchivePackagesService) {}

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get('projects/:projectId/archive-packages')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.archivePackagesService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_ARCHIVE)
  @Post('projects/:projectId/archive-packages')
  create(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.archivePackagesService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createArchivePackageSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.ASSET_DOWNLOAD)
  @Get('archive-packages/:packageId/download-intent')
  downloadIntent(@Req() request: { auth?: AuthContext }, @Param('packageId') packageId: string) {
    const tenant = requireTenant(request.auth);
    return this.archivePackagesService.downloadIntent({ tenantId: tenant.tenantId, packageId });
  }
}
