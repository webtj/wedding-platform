import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { upsertChannelBindingDtoSchema } from './dto';
import { ChannelBindingsService } from './channel-bindings.service';

@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/channels')
export class ChannelBindingsController {
  constructor(private readonly channelBindingsService: ChannelBindingsService) {}

  @RequirePermissions(PERMISSIONS.PLATFORM_CHANNEL_READ)
  @Get()
  list() { return this.channelBindingsService.list(); }

  @RequirePermissions(PERMISSIONS.PLATFORM_CHANNEL_MANAGE)
  @Post()
  create(@Body() body: unknown) { return this.channelBindingsService.create(upsertChannelBindingDtoSchema.parse(body)); }

  @RequirePermissions(PERMISSIONS.PLATFORM_CHANNEL_MANAGE)
  @Put(':channelId')
  update(@Param('channelId') channelId: string, @Body() body: unknown) { return this.channelBindingsService.update(channelId, upsertChannelBindingDtoSchema.parse(body)); }
}
