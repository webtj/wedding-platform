import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AiGenerationType } from '@prisma/client';
import { SettingsService } from '../../settings/settings.service';
import { ProviderRegistry, AI_CAPABILITY } from '../core';
import type { ProviderConfig, Text2ImageProvider, Image2ImageProvider } from '../core/provider.interfaces';
import { mapToProviderSize } from './size-mapper';

interface ImageSettings extends ProviderConfig {
  enabled: boolean;
}

interface FeatureSettings {
  text2img: boolean;
  img2img: boolean;
  psdExport: boolean;
}

export interface GenerateResult {
  images: string[];
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly registry: ProviderRegistry
  ) {}

  async generate(prompt: string, size: { width: number; height: number }, type: AiGenerationType, sourceUrl?: string): Promise<GenerateResult> {
    const features = await this.getFeatureSettings();

    if (type === 'text2img' && !features.text2img) {
      throw new ForbiddenException('文生图功能已关闭');
    }
    if (type === 'img2img' && !features.img2img) {
      throw new ForbiddenException('图生图功能已关闭');
    }

    const settings = await this.getImageSettings();
    const apiSize = mapToProviderSize(size);

    // 图生图：走 image2image capability
    if (type === 'img2img' && sourceUrl) {
      const provider = this.registry.resolve(AI_CAPABILITY.IMAGE2IMAGE, settings.provider, settings) as Image2ImageProvider;
      return provider.generateFromImage({ sourceImageUrl: sourceUrl, prompt, size: apiSize });
    }

    // 文生图
    const provider = this.registry.resolve(AI_CAPABILITY.TEXT2IMAGE, settings.provider, settings) as Text2ImageProvider;
    return provider.generate({ prompt, size: apiSize });
  }

  async testConnection(config: ProviderConfig): Promise<boolean> {
    const provider = this.registry.resolve(AI_CAPABILITY.TEXT2IMAGE, config.provider, config) as Text2ImageProvider;
    return provider.testConnection();
  }

  private async getImageSettings(): Promise<ImageSettings> {
    const aiGroup = await this.settingsService.getByGroup('ai');
    const setting = aiGroup.find((s) => s.key === 'ai.image');
    return (setting?.value as unknown as ImageSettings) ?? {
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-image-1',
      enabled: true
    };
  }

  private async getFeatureSettings(): Promise<FeatureSettings> {
    const aiGroup = await this.settingsService.getByGroup('ai');
    const setting = aiGroup.find((s) => s.key === 'ai.features');
    return (setting?.value as unknown as FeatureSettings) ?? {
      text2img: true,
      img2img: true,
      psdExport: true
    };
  }
}
