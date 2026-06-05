import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { ProviderRegistry, AI_CAPABILITY } from '../core';
import type { ProviderConfig, Text2TextProvider } from '../core/provider.interfaces';
import { TemplateService } from '../templates/template.service';

const SYSTEM_PROMPT = `You are a senior wedding aesthetic designer and AI image generation expert.

Your task is to expand the user's simple requirements into a high-quality image generation prompt.

Rules:
1. Output pure English prompt, no Chinese
2. Description should be specific, professional, and visually evocative
3. Include: style, elements, colors, composition, lighting, texture
4. End with: 4k high-definition, micro-shot
5. Adjust ratio based on dimensions: --ar 2:3 (portrait) / --ar 3:2 (landscape) / --ar 1:1 (square)
6. Do not include text descriptions (AI image generation often misspells text)

Example input: French retro style vow card, bride name Li Mei
Example output:
"A luxury, minimalist French retro wedding vow card background,
botanical oil painting texture, pure white roses, sage green leaves,
blank space in the center for text overlay, soft golden hour lighting,
vintage paper texture, elegant and romantic atmosphere,
4k high-definition, micro-shot --ar 2:3"`;

interface Text2TextSettings extends ProviderConfig {
  enabled: boolean;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private readonly settingsService: SettingsService,
    private readonly registry: ProviderRegistry,
    private readonly templateService: TemplateService,
  ) {}

  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      throw new Error('LLM service is not enabled');
    }

    try {
      const provider = this.registry.resolve(AI_CAPABILITY.TEXT2TEXT, settings.provider, settings) as Text2TextProvider;

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system' as const, content: systemPrompt });
      }
      messages.push({ role: 'user' as const, content: prompt });

      const result = await provider.chat({
        messages,
        temperature: 0.3,
        maxTokens: 2000
      });

      if (!result.content) {
        throw new Error('LLM returned empty content');
      }
      return result.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`LLM chat failed: ${message.slice(0, 200)}`);
      throw error;
    }
  }

  async expandPrompt(
    userInput: string,
    materialCode: string,
    style: string,
    size: { width: number; height: number }
  ): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      return this.buildFallbackPrompt(userInput, materialCode, style, size);
    }

    try {
      const provider = this.registry.resolve(AI_CAPABILITY.TEXT2TEXT, settings.provider, settings) as Text2TextProvider;

      const materialHint = this.templateService.getMaterialPrompt(materialCode);
      const styleHint = this.templateService.getStyleDescription(style);
      const aspectRatio = size.width > size.height ? '--ar 3:2' : size.height > size.width ? '--ar 2:3' : '--ar 1:1';

      const result = await provider.chat({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Material type: ${materialCode} (${materialHint})
Style: ${styleHint}
User description: ${userInput}
Aspect ratio: ${aspectRatio}

Generate the expanded prompt now.` }
        ],
        temperature: 0.7,
        maxTokens: 3000
      });

      if (!result.content) {
        this.logger.warn('LLM returned empty content, using fallback');
        return this.buildFallbackPrompt(userInput, materialCode, style, size);
      }
      return result.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`LLM expansion failed: ${message.slice(0, 200)}, falling back to template`);
      return this.buildFallbackPrompt(userInput, materialCode, style, size);
    }
  }

  async expandRefinePrompt(input: {
    originalPrompt: string;
    originalAiPrompt: string;
    feedback: string;
    materialCode: string;
    style: string;
    size: { width: number; height: number };
  }): Promise<string> {
    const userInput = [
      'Revise the wedding image generation prompt based on user feedback.',
      `Original user request: ${input.originalPrompt}`,
      `Original expanded prompt: ${input.originalAiPrompt}`,
      `Feedback: ${input.feedback}`,
      'Keep the useful visual structure unless the feedback asks to change it.'
    ].join('\n');

    return this.expandPrompt(userInput, input.materialCode, input.style, input.size);
  }

  async buildSeriesPrompt(input: {
    originalPrompt: string;
    originalAiPrompt: string;
    sourceMaterialCode: string;
    targetMaterialCode: string;
    style: string;
    size: { width: number; height: number };
    instruction: string;
  }): Promise<string> {
    const userInput = [
      'Create a matching wedding visual material in the same series.',
      `Original user request: ${input.originalPrompt}`,
      `Original expanded prompt: ${input.originalAiPrompt}`,
      `Source material: ${input.sourceMaterialCode}`,
      `Target material: ${input.targetMaterialCode}`,
      `User instruction: ${input.instruction}`
    ].join('\n');

    return this.expandPrompt(userInput, input.targetMaterialCode, input.style, input.size);
  }

  buildFallbackPrompt(
    userInput: string,
    materialCode: string,
    style: string,
    size: { width: number; height: number }
  ): string {
    const materialHint = this.templateService.getMaterialPrompt(materialCode) || 'wedding material';
    const styleHint = this.templateService.getStyleDescription(style);
    const aspectRatio = size.width > size.height ? '--ar 3:2' : size.height > size.width ? '--ar 2:3' : '--ar 1:1';
    return `${styleHint}, ${materialHint}, ${userInput}, 4k high-definition, micro-shot ${aspectRatio}`;
  }

  private async getSettings(): Promise<Text2TextSettings> {
    const aiGroup = await this.settingsService.getByGroup('ai');
    const setting = aiGroup.find((s) => s.key === 'ai.llm');
    return (setting?.value as unknown as Text2TextSettings) ?? {
      provider: 'openai',
      baseUrl: '',
      apiKey: '',
      model: '',
      enabled: false
    };
  }
}
