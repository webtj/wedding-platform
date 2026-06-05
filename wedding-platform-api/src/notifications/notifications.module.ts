import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { MessageSenderService } from './message-sender.service';

@Module({
  imports: [IdentityModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationPreferencesService, MessageSenderService],
  exports: [NotificationsService, NotificationPreferencesService, MessageSenderService]
})
export class NotificationsModule {}
