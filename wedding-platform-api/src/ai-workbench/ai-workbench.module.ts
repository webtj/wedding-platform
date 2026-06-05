import { Module, OnModuleInit } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { AiCoreModule, ProviderRegistry } from './core';
import { AiWorkbenchController } from './ai-workbench.controller';
import { ConversationController } from './conversation.controller';
import { GenerationJobController } from './jobs/generation-job.controller';
import { AiWorkbenchService } from './ai-workbench.service';
import { LlmService } from './llm/llm.service';
import { ImageService } from './image/image.service';
import { QuotaService } from './quota.service';
import { ConversationService } from './conversation.service';
import { IntentParserService } from './intent/intent-parser.service';
import { PromptPlannerService } from './prompt/prompt-planner.service';
import { DesignStateService } from './state/design-state.service';
import { AiReferenceAssetService } from './assets/ai-reference-asset.service';
import { AiReferenceAssetController } from './assets/ai-reference-asset.controller';
import { ResultComposerService } from './composer/result-composer.service';
import { SvgTemplateService } from './composer/svg-template.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { GenerationJobService } from './jobs/generation-job.service';
import { GenerationEventsService } from './events/generation-events.service';
import { AiMetricsController } from './metrics/ai-metrics.controller';
import { AiMetricsService } from './metrics/ai-metrics.service';
import { OpenAITextProvider } from './providers/openai-text.provider';
import { OpenAIImageProvider } from './providers/openai-image.provider';
import { ModelScopeProvider } from './providers/modelscope.provider';
import { ProviderRouterService } from './router/provider-router.service';
import { TemplateService } from './templates/template.service';
import { TextGenerationService } from './text/text-generation.service';
import { TextGenerationController } from './text/text-generation.controller';

@Module({
  imports: [IdentityModule, SettingsModule, AiCoreModule, StorageModule],
  controllers: [AiWorkbenchController, ConversationController, AiReferenceAssetController, GenerationJobController, AiMetricsController, TextGenerationController],
  providers: [
    AiWorkbenchService,
    LlmService,
    ImageService,
    QuotaService,
    ConversationService,
    IntentParserService,
    PromptPlannerService,
    DesignStateService,
    AiReferenceAssetService,
    ResultComposerService,
    SvgTemplateService,
    ObjectStorageService,
    GenerationJobService,
    GenerationEventsService,
    AiMetricsService,
    OpenAITextProvider,
    OpenAIImageProvider,
    ModelScopeProvider,
    ProviderRouterService,
    TemplateService,
    TextGenerationService,
  ],
  exports: [
    AiWorkbenchService,
    LlmService,
    ImageService,
    QuotaService,
    ConversationService,
    IntentParserService,
    PromptPlannerService,
    DesignStateService,
    AiReferenceAssetService,
    ResultComposerService,
    SvgTemplateService,
    ObjectStorageService,
    GenerationJobService,
    GenerationEventsService,
    AiMetricsService,
    ProviderRouterService,
    TextGenerationService
  ]
})
export class AiWorkbenchModule implements OnModuleInit {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly openaiText: OpenAITextProvider,
    private readonly openaiImage: OpenAIImageProvider,
    private readonly modelscope: ModelScopeProvider
  ) {}

  onModuleInit() {
    this.registry.register(this.openaiText);
    this.registry.register(this.openaiImage);
    this.registry.register(this.modelscope);
    // Image2Image：复用同实例，capabilityOverride 注册
    this.registry.register(this.openaiImage, 'image2image');
    // ModelScope 不支持真正的图生图，不注册 image2image capability
  }
}
