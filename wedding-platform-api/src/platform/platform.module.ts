import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ChannelBindingsController } from './channel-bindings.controller';
import { ChannelBindingsService } from './channel-bindings.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { TenantSubscriptionsController } from './tenant-subscriptions.controller';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';

@Module({
  imports: [IdentityModule],
  controllers: [PlansController, TenantSubscriptionsController, PlatformSettingsController, ChannelBindingsController],
  providers: [PlansService, TenantSubscriptionsService, PlatformSettingsService, ChannelBindingsService],
  exports: [PlansService, TenantSubscriptionsService, PlatformSettingsService, ChannelBindingsService]
})
export class PlatformModule {}
