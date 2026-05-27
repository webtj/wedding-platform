import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [IdentityModule, AuditModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService]
})
export class TasksModule {}
