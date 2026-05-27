import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RetentionController } from './retention.controller';
import { RetentionService } from './retention.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [RetentionController],
  providers: [RetentionService],
  exports: [RetentionService]
})
export class StorageModule {}
