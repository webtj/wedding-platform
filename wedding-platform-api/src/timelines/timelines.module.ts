import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TimelinesController } from './timelines.controller';
import { TimelinesService } from './timelines.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [TimelinesController],
  providers: [TimelinesService],
  exports: [TimelinesService]
})
export class TimelinesModule {}
