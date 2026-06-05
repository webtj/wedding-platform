import { describe, expect, it, vi } from 'vitest';
import { ProviderRouterService } from './provider-router.service';

const buildSettings = () => ({
  getByGroup: vi.fn().mockResolvedValue([
    { key: 'ai.image', value: { model: 'gpt-image-1' } }
  ])
});

describe('ProviderRouterService', () => {
  describe('route', () => {
    it('uses preferred provider when it is capable', async () => {
      const settings = buildSettings();
      const service = new ProviderRouterService(settings as never);
      const result = await service.route({ type: 'text2img', preferredProvider: 'openai' });
      expect(result.provider).toBe('openai');
      expect(result.reason).toContain('User preferred');
    });

    it('selects cheapest capable provider for text2img', async () => {
      const settings = buildSettings();
      const service = new ProviderRouterService(settings as never);
      const result = await service.route({ type: 'text2img' });
      expect(result.provider).toBe('modelscope');
      expect(result.fallbackProvider).toBe('openai');
    });

    it('prefers providers with better img2img support', async () => {
      const settings = buildSettings();
      const service = new ProviderRouterService(settings as never);
      const result = await service.route({ type: 'img2img' });
      expect(result.provider).toBe('openai');
    });

    it('throws when no provider is capable', async () => {
      const settings = buildSettings();
      const service = new ProviderRouterService(settings as never);
      await expect(service.route({ type: 'unknown_type' } as never)).rejects.toThrow('No provider capable');
    });

    it('falls back to auto-selection when preferred provider is not capable', async () => {
      const settings = buildSettings();
      const service = new ProviderRouterService(settings as never);
      const result = await service.route({ type: 'text2img', preferredProvider: 'nonexistent' });
      expect(['openai', 'modelscope']).toContain(result.provider);
    });
  });

  describe('getCapabilities', () => {
    it('returns capabilities for a known provider', () => {
      const service = new ProviderRouterService(buildSettings() as never);
      const cap = service.getCapabilities('openai');
      expect(cap).toBeDefined();
      expect(cap!.textToImage).toBe(true);
      expect(cap!.region).toBe('global');
    });

    it('returns undefined for unknown provider', () => {
      const service = new ProviderRouterService(buildSettings() as never);
      expect(service.getCapabilities('unknown')).toBeUndefined();
    });
  });

  describe('listProviders', () => {
    it('returns all registered provider capabilities', () => {
      const service = new ProviderRouterService(buildSettings() as never);
      const list = service.listProviders();
      expect(list.length).toBeGreaterThanOrEqual(2);
      expect(list.map((p) => p.provider)).toContain('openai');
      expect(list.map((p) => p.provider)).toContain('modelscope');
    });
  });
});
