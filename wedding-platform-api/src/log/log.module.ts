import { Global, Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AnalyticsController } from './analytics.controller';
import { LogController } from './log.controller';
import { LogQueueService } from './log-queue.service';
import { LogService } from './log.service';

@Global()
@Module({
  imports: [IdentityModule],
  controllers: [LogController, AnalyticsController],
  providers: [LogQueueService, LogService],
  exports: [LogQueueService, LogService],
})
export class LogModule {}
