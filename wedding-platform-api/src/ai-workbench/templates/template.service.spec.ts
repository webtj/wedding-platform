import { describe, expect, it } from 'vitest';
import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(async () => {
    service = new TemplateService();
    await service.onModuleInit();
  });

  describe('getStyleDescription', () => {
    it('returns default style description', () => {
      const desc = service.getStyleDescription('french_pastoral');
      expect(desc).toContain('French pastoral');
    });

    it('returns the style code itself when not in defaults', () => {
      expect(service.getStyleDescription('unknown_style')).toBe('unknown_style');
    });

    it('returns all default styles', () => {
      expect(service.getStyleDescription('cream')).toContain('Cream');
      expect(service.getStyleDescription('morandi')).toContain('Morandi');
      expect(service.getStyleDescription('oil_painting')).toContain('oil painting');
    });
  });

  describe('getMaterialPrompt', () => {
    it('returns default material prompt', () => {
      expect(service.getMaterialPrompt('vow_card')).toContain('vow card');
    });

    it('returns empty string for unknown material', () => {
      expect(service.getMaterialPrompt('unknown')).toBe('');
    });

    it('returns all default materials', () => {
      expect(service.getMaterialPrompt('table_card')).toContain('table');
      expect(service.getMaterialPrompt('sticker')).toContain('sticker');
    });
  });

  describe('getMaterialInstruction', () => {
    it('returns instruction for known material', () => {
      expect(service.getMaterialInstruction('vow_card')).toContain('vow card');
    });

    it('returns empty string for unknown material', () => {
      expect(service.getMaterialInstruction('unknown')).toBe('');
    });
  });

  describe('onModuleInit', () => {
    it('warms caches with defaults', () => {
      // Already called in beforeEach
      expect(service.getStyleDescription('french_pastoral')).toContain('French pastoral');
      expect(service.getMaterialPrompt('vow_card')).toContain('vow card');
    });
  });

  describe('refresh', () => {
    it('clears and reloads caches', async () => {
      await service.refresh();
      expect(service.getStyleDescription('french_pastoral')).toContain('French pastoral');
      expect(service.getMaterialPrompt('vow_card')).toContain('vow card');
    });
  });
});
