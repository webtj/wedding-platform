import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService]
})
export class ContractsModule {}
