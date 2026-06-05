import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ImageService } from './image.service';

const buildSettings = (overrides: Record<string, unknown> = {}) => ({
  getByGroup: vi.fn().mockResolvedValue([
    { key: 'ai.image', value: { provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', model: 'gpt-image-1', enabled: true } },
    { key: 'ai.features', value: { text2img: true, img2img: true, psdExport: true, ...overrides } }
  ])
});

const buildRegistry = () => ({
  resolve: vi.fn().mockReturnValue({
    generate: vi.fn().mockResolvedValue({ images: ['img1.png'], metadata: {} }),
    generateFromImage: vi.fn().mockResolvedValue({ images: ['img2.png'], metadata: {} }),
    testConnection: vi.fn().mockResolvedValue(true)
  })
});

describe('ImageService', () => {
  describe('generate', () => {
    it('resolves text2image provider and returns images', async () => {
      const settings = buildSettings();
      const registry = buildRegistry();
      const service = new ImageService(settings as never, registry as never);

      const result = await service.generate('婚礼背景', { width: 1024, height: 1024 }, 'text2img');
      expect(result.images).toEqual(['img1.png']);
      expect(registry.resolve).toHaveBeenCalledWith('text2image', 'openai', expect.any(Object));
    });

    it('resolves image2image provider when type=img2img and sourceUrl provided', async () => {
      const settings = buildSettings();
      const registry = buildRegistry();
      const service = new ImageService(settings as never, registry as never);

      await service.generate('美化', { width: 1024, height: 1024 }, 'img2img', 'http://source.png');
      expect(registry.resolve).toHaveBeenCalledWith('image2image', 'openai', expect.any(Object));
    });

    it('throws ForbiddenException when text2img feature is disabled', async () => {
      const settings = buildSettings({ text2img: false });
      const service = new ImageService(settings as never, buildRegistry() as never);
      await expect(
        service.generate('p', { width: 512, height: 512 }, 'text2img')
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ForbiddenException when img2img feature is disabled', async () => {
      const settings = buildSettings({ img2img: false });
      const service = new ImageService(settings as never, buildRegistry() as never);
      await expect(
        service.generate('p', { width: 512, height: 512 }, 'img2img', 'http://src.png')
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('testConnection', () => {
    it('delegates to the text2image provider testConnection', async () => {
      const registry = buildRegistry();
      const service = new ImageService(buildSettings() as never, registry as never);
      const result = await service.testConnection({ provider: 'openai' } as never);
      expect(result).toBe(true);
      expect(registry.resolve).toHaveBeenCalledWith('text2image', 'openai', expect.any(Object));
    });
  });
});
