import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS, upsertRetentionPolicySchema } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { RetentionService } from './retention.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get('projects/:projectId/retention-policy')
  getPolicy(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.retentionService.getPolicy({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Put('projects/:projectId/retention-policy')
  upsertPolicy(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.retentionService.upsertPolicy({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: upsertRetentionPolicySchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_READ)
  @Get('storage/expiration-reminders')
  reminders(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.retentionService.listReminders({ tenantId: tenant.tenantId });
  }

  @RequirePermissions(PERMISSIONS.PROJECT_UPDATE)
  @Post('projects/:projectId/storage/expiration-reminders/generate')
  generate(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.retentionService.generateReminders({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId
    });
  }
}
