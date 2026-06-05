import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  Text2TextProvider,
  Text2TextInput,
  Text2TextOutput,
  ProviderConfig
} from '../core/provider.interfaces';

/**
 * OpenAI 兼容协议 LLM provider。
 * 覆盖 OpenAI / DeepSeek / 通义 / MiMo 等所有 chat/completions 端点。
 */
@Injectable()
export class OpenAITextProvider implements Text2TextProvider {
  readonly capability = 'text2text' as const;
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAITextProvider.name);
  private config!: ProviderConfig;
  private client!: OpenAI;

  configure(config: ProviderConfig) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  }

  async chat(input: Text2TextInput): Promise<Text2TextOutput> {
    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 3000
    });
    const choice = completion.choices?.[0]?.message;
    return {
      content: choice?.content?.trim() ?? '',
      usage: completion.usage
        ? { promptTokens: completion.usage.prompt_tokens, completionTokens: completion.usage.completion_tokens }
        : undefined
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (err) {
      this.logger.warn(`testConnection failed: ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }
}
