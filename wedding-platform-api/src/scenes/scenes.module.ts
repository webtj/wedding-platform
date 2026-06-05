import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { AiWorkbenchModule } from '../ai-workbench/ai-workbench.module';
import { ScenesController } from './scenes.controller';
import { ScenesService } from './scenes.service';
import { SceneAiService } from './scene-ai.service';

@Module({
  imports: [IdentityModule, SettingsModule, StorageModule, AiWorkbenchModule],
  controllers: [ScenesController],
  providers: [ScenesService, SceneAiService],
  exports: [ScenesService, SceneAiService]
})
export class ScenesModule {}
