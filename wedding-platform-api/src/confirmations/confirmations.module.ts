import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfirmationsController } from './confirmations.controller';
import { ConfirmationsService } from './confirmations.service';

@Module({
  imports: [IdentityModule, AuditModule, NotificationsModule],
  controllers: [ConfirmationsController],
  providers: [ConfirmationsService],
  exports: [ConfirmationsService]
})
export class ConfirmationsModule {}
