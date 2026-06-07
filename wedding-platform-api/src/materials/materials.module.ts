import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { AuditModule } from '../audit/audit.module';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService]
})
export class MaterialsModule {}
