import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { PlatformGuard } from '../common/auth/platform.guard';
import { batchUpdateSettingsSchema, testConnectionSchema, updateSettingSchema } from './dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard, PlatformGuard)
@Controller('super/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Get(':group')
  getByGroup(@Param('group') group: string) {
    return this.settingsService.getByGroup(group);
  }

  @Put(':group/:key')
  upsert(
    @Param('group') group: string,
    @Param('key') key: string,
    @Body() body: unknown
  ) {
    return this.settingsService.upsert(group, key, updateSettingSchema.parse(body));
  }

  @Put(':group')
  batchUpdate(@Param('group') group: string, @Body() body: unknown) {
    return this.settingsService.batchUpdate(group, batchUpdateSettingsSchema.parse(body));
  }

  @Post('ai/test-connection')
  testConnection(@Body() body: unknown) {
    return this.settingsService.testConnection(testConnectionSchema.parse(body));
  }
}
