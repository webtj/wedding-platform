import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { updateTenantSubscriptionDtoSchema } from './dto';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';

@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform')
export class TenantSubscriptionsController {
  constructor(private readonly subscriptionsService: TenantSubscriptionsService) {}

  @RequirePermissions(PERMISSIONS.PLATFORM_SUBSCRIPTION_READ)
  @Get('tenant-subscriptions')
  list() { return this.subscriptionsService.list(); }

  @RequirePermissions(PERMISSIONS.PLATFORM_SUBSCRIPTION_MANAGE)
  @Put('tenants/:tenantId/subscription')
  upsert(@Param('tenantId') tenantId: string, @Body() body: unknown) { return this.subscriptionsService.upsert(tenantId, updateTenantSubscriptionDtoSchema.parse(body)); }

  @RequirePermissions(PERMISSIONS.PLATFORM_SUBSCRIPTION_READ)
  @Get('tenants/:tenantId/usage')
  usage(@Param('tenantId') tenantId: string) { return this.subscriptionsService.usage(tenantId); }
}
