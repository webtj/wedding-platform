import { IdentityModule } from '../identity/identity.module';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AiProvider } from './ai-provider';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiTemplatesController } from './ai-templates.controller';
import { AiTemplatesService } from './ai-templates.service';
import { AiVersionsController } from './ai-versions.controller';
import { AiVersionsService } from './ai-versions.service';
import { TemplateAiProvider } from './template-ai-provider';

@Module({
  imports: [IdentityModule, AuditModule],
  controllers: [AiController, AiTemplatesController, AiVersionsController],
  providers: [
    AiService,
    AiTemplatesService,
    AiVersionsService,
    TemplateAiProvider,
    {
      provide: AiProvider,
      useExisting: TemplateAiProvider
    }
  ],
  exports: [AiService, AiTemplatesService, AiVersionsService]
})
export class AiModule {}
