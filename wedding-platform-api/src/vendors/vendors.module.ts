import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PublicCasesController } from './public-cases.controller';
import { PublicCasesService } from './public-cases.service';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [IdentityModule],
  controllers: [VendorsController, PublicCasesController],
  providers: [VendorsService, PublicCasesService],
  exports: [VendorsService, PublicCasesService]
})
export class VendorsModule {}
