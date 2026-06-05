import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { upsertPlatformSettingDtoSchema } from './dto';
import { PlatformSettingsService } from './platform-settings.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('platform/settings')
export class PlatformSettingsController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @Get()
  list() { return this.settingsService.list(); }

  @Put(':key')
  upsert(@Param('key') key: string, @Body() body: unknown) { return this.settingsService.upsert(key, upsertPlatformSettingDtoSchema.parse(body)); }
}
