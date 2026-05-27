import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ProcessTemplatesController } from './process-templates.controller';
import { ProcessTemplatesService } from './process-templates.service';

@Module({
  imports: [IdentityModule],
  controllers: [ProcessTemplatesController],
  providers: [ProcessTemplatesService],
  exports: [ProcessTemplatesService]
})
export class ProcessTemplatesModule {}
