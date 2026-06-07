import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LeadsController } from './leads.controller';
import { LeadsOperationsController } from './leads-operations.controller';
import { LeadsStatsController } from './leads-stats.controller';
import { LeadsOperationsService } from './leads-operations.service';
import { LeadsService } from './leads.service';
import { LeadsStatsService } from './leads-stats.service';
import { NavBadgesController } from './nav-badges.controller';
import { NavBadgesService } from './nav-badges.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [LeadsController, LeadsOperationsController, LeadsStatsController, NavBadgesController],
  providers: [LeadsService, LeadsOperationsService, LeadsStatsService, NavBadgesService],
  exports: [LeadsService, LeadsOperationsService, LeadsStatsService, NavBadgesService]
})
export class CrmModule {}
