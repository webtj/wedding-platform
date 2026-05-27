import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@wedding/shared';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/auth/permissions.guard';
import { PlatformAdminGuard } from '../common/auth/platform-admin.guard';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { upsertPlatformSettingDtoSchema } from './dto';
import { PlatformSettingsService } from './platform-settings.service';

@UseGuards(JwtAuthGuard, PlatformAdminGuard, PermissionsGuard)
@Controller('platform/settings')
export class PlatformSettingsController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @RequirePermissions(PERMISSIONS.PLATFORM_SETTING_READ)
  @Get()
  list() { return this.settingsService.list(); }

  @RequirePermissions(PERMISSIONS.PLATFORM_SETTING_MANAGE)
  @Put(':key')
  upsert(@Param('key') key: string, @Body() body: unknown) { return this.settingsService.upsert(key, upsertPlatformSettingDtoSchema.parse(body)); }
}
