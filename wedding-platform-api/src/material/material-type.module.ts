import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MaterialTypeController } from './material-type.controller';
import { MaterialTypeService } from './material-type.service';

@Module({
  imports: [IdentityModule],
  controllers: [MaterialTypeController],
  providers: [MaterialTypeService],
  exports: [MaterialTypeService]
})
export class MaterialTypeModule {}
