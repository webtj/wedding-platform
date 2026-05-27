import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LeadsController } from './leads.controller';
import { LeadsOperationsController } from './leads-operations.controller';
import { LeadsOperationsService } from './leads-operations.service';
import { LeadsService } from './leads.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [LeadsController, LeadsOperationsController],
  providers: [LeadsService, LeadsOperationsService],
  exports: [LeadsService, LeadsOperationsService]
})
export class CrmModule {}
