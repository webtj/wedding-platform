import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import type { AuthContext } from '../common/auth/auth-context';
import { requireTenant } from '../common/tenant-context';
import { createConfirmationSchema, respondConfirmationSchema } from './dto';
import { ConfirmationsService } from './confirmations.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ConfirmationsController {
  constructor(private readonly confirmationsService: ConfirmationsService) {}

  @RequirePermissions(PERMISSIONS.CONFIRMATION_READ)
  @Get('projects/:projectId/confirmations')
  list(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string) {
    const tenant = requireTenant(request.auth);
    return this.confirmationsService.list({ tenantId: tenant.tenantId, projectId });
  }

  @RequirePermissions(PERMISSIONS.CONFIRMATION_CREATE)
  @Post('projects/:projectId/confirmations')
  create(@Req() request: { auth?: AuthContext }, @Param('projectId') projectId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.confirmationsService.create({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      projectId,
      data: createConfirmationSchema.parse(body)
    });
  }

  @RequirePermissions(PERMISSIONS.CONFIRMATION_RESPOND)
  @Post('confirmations/:confirmationId/respond')
  respond(@Req() request: { auth?: AuthContext }, @Param('confirmationId') confirmationId: string, @Body() body: unknown) {
    const tenant = requireTenant(request.auth);
    return this.confirmationsService.respond({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      confirmationId,
      data: respondConfirmationSchema.parse(body)
    });
  }
}
