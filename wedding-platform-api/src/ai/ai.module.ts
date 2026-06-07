import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiProvider } from './ai-provider';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiVersionsController } from './ai-versions.controller';
import { AiVersionsService } from './ai-versions.service';
import { TemplateAiProvider } from './template-ai-provider';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [AiController, AiVersionsController],
  providers: [
    AiService,
    AiVersionsService,
    TemplateAiProvider,
    {
      provide: AiProvider,
      useExisting: TemplateAiProvider
    }
  ],
  exports: [AiService, AiVersionsService]
})
export class AiModule {}
