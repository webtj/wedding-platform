import { describe, expect, it, vi } from 'vitest';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  describe('getStyleDescription', () => {
    it('returns default style when cache is empty', () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new TemplateService(prisma as never);
      const desc = service.getStyleDescription('french_pastoral');
      expect(desc).toContain('French pastoral');
    });

    it('returns the style code itself when not in cache or defaults', () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new TemplateService(prisma as never);
      expect(service.getStyleDescription('unknown_style')).toBe('unknown_style');
    });

    it('uses DB cache over defaults when available', async () => {
      const prisma = {
        aiTemplate: {
          findMany: vi.fn()
            .mockResolvedValueOnce([{ code: 'style_french_pastoral', prompt: 'DB style prompt' }])
            .mockResolvedValueOnce([])
        }
      };
      const service = new TemplateService(prisma as never);
      await service.onModuleInit();
      expect(service.getStyleDescription('french_pastoral')).toBe('DB style prompt');
    });
  });

  describe('getMaterialPrompt', () => {
    it('returns default material prompt when cache is empty', () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new TemplateService(prisma as never);
      expect(service.getMaterialPrompt('vow_card')).toContain('vow card');
    });

    it('returns empty string for unknown material', () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new TemplateService(prisma as never);
      expect(service.getMaterialPrompt('unknown')).toBe('');
    });
  });

  describe('getMaterialInstruction', () => {
    it('returns instruction from MATERIAL_INSTRUCTIONS', () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new TemplateService(prisma as never);
      expect(service.getMaterialInstruction('vow_card')).toContain('vow card');
    });

    it('returns empty string for unknown material', () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new TemplateService(prisma as never);
      expect(service.getMaterialInstruction('unknown')).toBe('');
    });
  });

  describe('onModuleInit', () => {
    it('warms caches from DB on init', async () => {
      const prisma = {
        aiTemplate: {
          findMany: vi.fn()
            .mockResolvedValueOnce([{ code: 'style_custom', prompt: 'custom style' }])
            .mockResolvedValueOnce([{ code: 'material_custom', prompt: 'custom material' }])
        }
      };
      const service = new TemplateService(prisma as never);
      await service.onModuleInit();
      expect(service.getStyleDescription('custom')).toBe('custom style');
      expect(service.getMaterialPrompt('custom')).toBe('custom material');
    });

    it('falls back to defaults when DB read fails', async () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockRejectedValue(new Error('db down')) } };
      const service = new TemplateService(prisma as never);
      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(service.getStyleDescription('french_pastoral')).toContain('French pastoral');
    });
  });

  describe('refresh', () => {
    it('clears caches and reloads from DB', async () => {
      const prisma = {
        aiTemplate: {
          findMany: vi.fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ code: 'style_new', prompt: 'new style' }])
            .mockResolvedValueOnce([])
        }
      };
      const service = new TemplateService(prisma as never);
      await service.onModuleInit();
      await service.refresh();
      expect(service.getStyleDescription('new')).toBe('new style');
    });
  });
});
