import { Injectable, Logger } from '@nestjs/common';
import type { AiGenerationType } from '@prisma/client';
import { SettingsService } from '../../settings/settings.service';

export interface ProviderCapability {
  provider: string;
  textToImage: boolean;
  imageToImage: boolean;
  editImage: boolean;
  multiImageInput: boolean;
  textRendering: 'poor' | 'medium' | 'good';
  region: 'global' | 'cn';
  maxImageSize: number;
  supportedAspectRatios: string[];
  avgLatencyMs: number;
  costPerImage: number;
}

export interface RoutingDecision {
  provider: string;
  model: string;
  reason: string;
  fallbackProvider?: string;
}

@Injectable()
export class ProviderRouterService {
  private readonly logger = new Logger(ProviderRouterService.name);

  private readonly capabilities: Record<string, ProviderCapability> = {
    openai: {
      provider: 'openai',
      textToImage: true,
      imageToImage: true,
      editImage: true,
      multiImageInput: true,
      textRendering: 'good',
      region: 'global',
      maxImageSize: 4096,
      supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
      avgLatencyMs: 15000,
      costPerImage: 0.04,
    },
    modelscope: {
      provider: 'modelscope',
      textToImage: true,
      imageToImage: false,
      editImage: false,
      multiImageInput: false,
      textRendering: 'medium',
      region: 'cn',
      maxImageSize: 2048,
      supportedAspectRatios: ['1:1', '16:9', '9:16'],
      avgLatencyMs: 30000,
      costPerImage: 0.01,
    },
  };

  constructor(private readonly settingsService: SettingsService) {}

  async route(task: {
    type: AiGenerationType;
    hasReferenceImage?: boolean;
    requiresTextRendering?: boolean;
    region?: 'cn' | 'global';
    preferredProvider?: string;
  }): Promise<RoutingDecision> {
    // If preferred provider is specified and capable, use it
    if (task.preferredProvider) {
      const cap = this.capabilities[task.preferredProvider];
      if (cap && this.isCapable(cap, task)) {
        return {
          provider: task.preferredProvider,
          model: await this.getModel(task.preferredProvider),
          reason: 'User preferred provider',
        };
      }
    }

    // Find capable providers
    const capable = Object.values(this.capabilities).filter(cap => this.isCapable(cap, task));

    if (capable.length === 0) {
      throw new Error(`No provider capable of handling task: ${JSON.stringify(task)}`);
    }

    // Sort by cost (prefer cheaper for simple tasks)
    // For img2img, prefer quality over cost
    const sorted = capable.sort((a, b) => {
      if (task.type === 'img2img') {
        // Prefer providers with better image-to-image support
        const aScore = (a.imageToImage ? 10 : 0) + (a.multiImageInput ? 5 : 0);
        const bScore = (b.imageToImage ? 10 : 0) + (b.multiImageInput ? 5 : 0);
        return bScore - aScore;
      }
      // For text2img, prefer cheaper
      return a.costPerImage - b.costPerImage;
    });

    const selected = sorted[0];
    const fallback = sorted[1];

    if (!selected) {
      throw new Error('No capable provider found');
    }

    return {
      provider: selected.provider,
      model: await this.getModel(selected.provider),
      reason: `Selected based on ${task.type} capability and cost`,
      fallbackProvider: fallback?.provider,
    };
  }

  private isCapable(cap: ProviderCapability, task: any): boolean {
    switch (task.type) {
      case 'text2img':
        return cap.textToImage;
      case 'img2img':
        return cap.imageToImage;
      case 'edit':
        return cap.editImage;
      default:
        return false;
    }
  }

  private async getModel(provider: string): Promise<string> {
    const aiGroup = await this.settingsService.getByGroup('ai');
    const setting = aiGroup.find((s: any) => s.key === `ai.${provider === 'openai' ? 'image' : provider}`);
    return (setting?.value as any)?.model || 'gpt-image-1';
  }

  getCapabilities(provider: string): ProviderCapability | undefined {
    return this.capabilities[provider];
  }

  listProviders(): ProviderCapability[] {
    return Object.values(this.capabilities);
  }
}
