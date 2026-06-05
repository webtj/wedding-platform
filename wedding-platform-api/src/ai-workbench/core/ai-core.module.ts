import { Module } from '@nestjs/common';
import { ProviderRegistry } from './provider.registry';

/**
 * 共享 AI 核心模块，导出 ProviderRegistry。
 * SettingsModule 和 AiWorkbenchModule 都 import 此模块，避免循环依赖。
 */
@Module({
  providers: [ProviderRegistry],
  exports: [ProviderRegistry]
})
export class AiCoreModule {}
