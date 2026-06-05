import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';

@Module({
  imports: [IdentityModule],
  controllers: [PlatformSettingsController],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService]
})
export class PlatformModule {}
