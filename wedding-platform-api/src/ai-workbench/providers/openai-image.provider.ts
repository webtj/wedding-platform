import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  Text2ImageProvider,
  Text2ImageInput,
  Text2ImageOutput,
  Image2ImageInput,
  Image2ImageOutput,
  ProviderConfig
} from '../core/provider.interfaces';

/**
 * OpenAI 兼容协议图片 provider（同步）。
 * 覆盖 OpenAI DALL·E / SiliconFlow Flux / 通义万相 等所有标准 images.generate 端点。
 *
 * 通过 capabilityOverride='image2image' 在 registry 注册，可同时服务图生图。
 */
@Injectable()
export class OpenAIImageProvider implements Text2ImageProvider {
  readonly name = 'openai';
  readonly capability = 'text2image' as const;
  private readonly logger = new Logger(OpenAIImageProvider.name);
  private config!: ProviderConfig;
  private client!: OpenAI;

  configure(config: ProviderConfig) {
    this.config = config;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
  }

  async generate(input: Text2ImageInput): Promise<Text2ImageOutput> {
    const n = input.n ?? 1;
    const response = await this.client.images.generate({
      model: this.config.model,
      prompt: input.prompt,
      n,
      size: `${input.size.width}x${input.size.height}` as `${number}x${number}`,
      response_format: 'url'
    });
    return {
      images: (response.data ?? []).map((item) => {
        if (item.url) return item.url;
        if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
        throw new Error('Image API returned neither url nor b64_json');
      }),
      metadata: { model: this.config.model, provider: this.name }
    };
  }

  async generateFromImage(input: Image2ImageInput): Promise<Image2ImageOutput> {
    // SSRF protection: block private/reserved IPs and metadata endpoints
    const url = new URL(input.sourceImageUrl);
    if (url.protocol !== 'https:') {
      throw new Error('Only HTTPS source images are accepted');
    }
    // Block known internal hostnames
    const blockedHosts = [
      'localhost', '127.0.0.1', '0.0.0.0',
      'metadata.google.internal',
      '169.254.169.254',
    ];
    if (blockedHosts.includes(url.hostname) || url.hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
      throw new Error('Internal network addresses are not allowed');
    }

    const sourceRes = await fetch(input.sourceImageUrl, { signal: AbortSignal.timeout(30000) });
    if (!sourceRes.ok) throw new Error(`Failed to fetch source image: ${sourceRes.status}`);
    const arrayBuffer = await sourceRes.arrayBuffer();
    const file = new File([arrayBuffer], 'source.png', { type: 'image/png' });

    const n = input.n ?? 1;
    const response = await this.client.images.edit({
      model: this.config.model,
      image: file,
      prompt: input.prompt,
      n,
      size: `${input.size.width}x${input.size.height}` as `${number}x${number}`,
      response_format: 'url'
    });
    return {
      images: (response.data ?? []).map((item) => {
        if (item.url) return item.url;
        if (item.b64_json) return `data:image/png;base64,${item.b64_json}`;
        throw new Error('Image API returned neither url nor b64_json');
      }),
      metadata: { model: this.config.model, provider: this.name }
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
