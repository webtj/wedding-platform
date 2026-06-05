import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { z } from 'zod';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { requireTenant } from '../common/tenant-context';
import type { AuthContext } from '../common/auth/auth-context';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService, updatePreferencesSchema } from './notification-preferences.service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(NotificationType).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
});

type ListQuery = z.infer<typeof listQuerySchema>;

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService
  ) {}

  @Get()
  list(
    @Req() request: { auth?: AuthContext },
    @Query() query: Record<string, string>
  ) {
    const tenant = requireTenant(request.auth);
    const parsed: ListQuery = listQuerySchema.parse(query);
    return this.notificationsService.listForUser({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      page: parsed.page,
      pageSize: parsed.pageSize,
      type: parsed.type,
      channel: parsed.channel,
      unreadOnly: parsed.unreadOnly
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

  @Patch(':notificationId/unread')
  markUnread(@Req() request: { auth?: AuthContext }, @Param('notificationId') notificationId: string) {
    const tenant = requireTenant(request.auth);
    return this.notificationsService.markUnread({
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

  @Delete(':notificationId')
  deleteNotification(@Req() request: { auth?: AuthContext }, @Param('notificationId') notificationId: string) {
    const tenant = requireTenant(request.auth);
    return this.notificationsService.deleteNotification({
      tenantId: tenant.tenantId,
      userId: tenant.userId,
      notificationId
    });
  }

  @Get('preferences')
  getPreferences(@Req() request: { auth?: AuthContext }) {
    const auth = request.auth!;
    return this.preferencesService.getPreferences(auth.userId);
  }

  @Put('preferences')
  updatePreferences(@Req() request: { auth?: AuthContext }, @Body() body: unknown) {
    const auth = request.auth!;
    const data = updatePreferencesSchema.parse(body);
    return this.preferencesService.updatePreferences(auth.userId, data);
  }
}
