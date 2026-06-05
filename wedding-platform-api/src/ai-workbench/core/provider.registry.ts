import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import type { AiCapability } from './capability';
import type { AiProvider, ProviderConfig } from './provider.interfaces';
import { toOpenAIBaseUrl } from '../base-url.util';

@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly providers = new Map<string, AiProvider>();

  register(provider: AiProvider, capabilityOverride?: AiCapability): void {
    const cap = capabilityOverride ?? provider.capability;
    const key = `${cap}:${provider.name}`;
    this.providers.set(key, provider);
    this.logger.log(`Registered provider: ${key}`);
  }

  resolve<C extends AiCapability>(capability: C, providerName: string, config: ProviderConfig): AiProvider {
    const key = `${capability}:${providerName}`;
    const provider = this.providers.get(key);
    if (!provider) {
      throw new BadRequestException(
        `Provider "${providerName}" for capability "${capability}" not found. ` +
        `Available: ${[...this.providers.keys()].filter(k => k.startsWith(capability + ':')).join(', ')}`
      );
    }
    provider.configure(this.normalizeConfig(providerName, config));
    return provider;
  }

  /**
   * 统一测试连接入口：settings.service 直接委托到这里，零 if/else。
   * capability 可选，不传则按 providerName 反查所有已注册 capability。
   */
  async testConnection(config: ProviderConfig, capability?: AiCapability): Promise<{ success: boolean; message: string }> {
    const caps = capability
      ? [capability]
      : (['text2text', 'text2image', 'image2image'] as AiCapability[]);

    for (const cap of caps) {
      const key = `${cap}:${config.provider}`;
      const provider = this.providers.get(key);
      if (!provider) continue;

      provider.configure(this.normalizeConfig(config.provider, config));
      try {
        const ok = await provider.testConnection();
        return ok
          ? { success: true, message: `${config.provider} (${cap}) 连接成功` }
          : { success: false, message: `${config.provider} (${cap}) 连接失败` };
      } catch (err) {
        return { success: false, message: `连接错误: ${err instanceof Error ? err.message : String(err)}` };
      }
    }

    return { success: false, message: `Provider "${config.provider}" 未注册` };
  }

  listProviders(capability: AiCapability): string[] {
    const prefix = `${capability}:`;
    return [...this.providers.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  }

  private normalizeConfig(_providerName: string, config: ProviderConfig): ProviderConfig {
    return { ...config, baseUrl: toOpenAIBaseUrl(config.baseUrl) };
  }
}
