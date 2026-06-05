import { Injectable, Logger } from '@nestjs/common';
import type {
  Text2ImageProvider,
  Text2ImageInput,
  Text2ImageOutput,
  Image2ImageInput,
  Image2ImageOutput,
  ProviderConfig
} from '../core/provider.interfaces';
import { pollAsyncTask } from '../core/async-task.poller';

interface ModelScopeTaskResponse {
  task_id: string;
  task_status: string;
  output_images?: string[];
}

@Injectable()
export class ModelScopeProvider implements Text2ImageProvider {
  readonly capability = 'text2image' as const;
  readonly name = 'modelscope';
  private readonly logger = new Logger(ModelScopeProvider.name);
  private config!: ProviderConfig;

  configure(config: ProviderConfig) {
    this.config = config;
  }

  async generate(input: Text2ImageInput): Promise<Text2ImageOutput> {
    const n = input.n ?? 1;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'X-ModelScope-Async-Mode': 'true'
    };

    // ModelScope 出图：一次只出一张，需要 n 张就并行提交 n 个 task
    const tasks = Array.from({ length: n }, () =>
      pollAsyncTask<ModelScopeTaskResponse>({
        submit: async () => {
          const res = await fetch(`${this.config.baseUrl}/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: this.config.model,
              prompt: input.prompt,
              width: input.size.width,
              height: input.size.height
            }),
            signal: AbortSignal.timeout(30000)
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`ModelScope submit failed: ${res.status} ${text.slice(0, 200)}`);
          }
          const data = (await res.json()) as { task_id: string };
          return { taskId: data.task_id };
        },
        poll: async (taskId: string) => {
          const res = await fetch(`${this.config.baseUrl}/tasks/${taskId}`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              'X-ModelScope-Task-Type': 'image_generation'
            },
            signal: AbortSignal.timeout(15000)
          });
          if (!res.ok) {
            return { status: 'processing' as const };
          }
          const data = (await res.json()) as ModelScopeTaskResponse;
          if (data.task_status === 'SUCCEED') {
            return { status: 'succeeded' as const, result: data };
          }
          if (data.task_status === 'FAILED') {
            return { status: 'failed' as const, error: 'ModelScope task failed' };
          }
          return { status: 'processing' as const };
        },
        intervalMs: 3000,
        maxAttempts: 60,
        extract: (result: ModelScopeTaskResponse) => {
          const url = result.output_images?.[0];
          if (!url) throw new Error('ModelScope returned no image');
          return url;
        }
      })
    );

    const images = await Promise.all(tasks);
    return {
      images: images as string[],
      metadata: { model: this.config.model, provider: this.name }
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(10000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateFromImage(input: Image2ImageInput): Promise<Image2ImageOutput> {
    this.logger.warn('ModelScope does not support img2img, falling back to text2img');
    return this.generate(input);
  }
}
