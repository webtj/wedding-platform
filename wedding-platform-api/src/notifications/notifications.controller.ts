import { Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { requireTenant } from '../common/tenant-context';
import type { AuthContext } from '../common/auth/auth-context';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.notificationsService.listForUser({
      tenantId: tenant.tenantId,
      userId: tenant.userId
    });
  }

  @Patch(':notificationId/read')
  markRead(@Req() request: { auth?: AuthContext }, @Param('notificationId') notificationId: string) {
    const tenant = requireTenant(request.auth);
    return this.notificationsService.markRead({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      notificationId
    });
  }

  @Get('unread-count')
  async unreadCount(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    const count = await this.notificationsService.unreadCount({
      tenantId: tenant.tenantId,
      userId: tenant.userId
    });
    return { count };
  }

  @Post('mark-all-read')
  markAllRead(@Req() request: { auth?: AuthContext }) {
    const tenant = requireTenant(request.auth);
    return this.notificationsService.markAllRead({
      tenantId: tenant.tenantId,
      userId: tenant.userId
    });
  }
}
