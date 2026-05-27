import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [ExpensesController, FinanceController],
  providers: [ExpensesService, FinanceService],
  exports: [ExpensesService, FinanceService]
})
export class FinanceModule {}
