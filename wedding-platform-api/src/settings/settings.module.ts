import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AiCoreModule } from '../ai-workbench/core';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [IdentityModule, AiCoreModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}
