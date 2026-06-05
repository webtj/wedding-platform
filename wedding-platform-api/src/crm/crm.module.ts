import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LeadsController } from './leads.controller';
import { LeadsOperationsController } from './leads-operations.controller';
import { LeadsStatsController } from './leads-stats.controller';
import { LeadsOperationsService } from './leads-operations.service';
import { LeadsService } from './leads.service';
import { LeadsStatsService } from './leads-stats.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [LeadsController, LeadsOperationsController, LeadsStatsController],
  providers: [LeadsService, LeadsOperationsService, LeadsStatsService],
  exports: [LeadsService, LeadsOperationsService, LeadsStatsService]
})
export class CrmModule {}
