import { describe, expect, it } from 'vitest';
import { SvgTemplateService } from './svg-template.service';

describe('SvgTemplateService', () => {
  describe('constructor', () => {
    it('registers 7 default templates on init', () => {
      const service = new SvgTemplateService();
      expect(service.list()).toHaveLength(7);
    });
  });

  describe('get', () => {
    it('returns a template by id', () => {
      const service = new SvgTemplateService();
      const tpl = service.get('vow-card-standard');
      expect(tpl).toBeDefined();
      expect(tpl!.name).toBe('标准誓言卡');
      expect(tpl!.type).toBe('vow_card');
      expect(tpl!.textPositions).toHaveLength(3);
    });

    it('returns undefined for unknown id', () => {
      const service = new SvgTemplateService();
      expect(service.get('nonexistent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns all templates when no type filter', () => {
      const service = new SvgTemplateService();
      expect(service.list()).toHaveLength(7);
    });

    it('filters by type when specified', () => {
      const service = new SvgTemplateService();
      const vowCards = service.list('vow_card');
      expect(vowCards).toHaveLength(1);
      expect(vowCards[0]!.id).toBe('vow-card-standard');
    });

    it('returns empty array for unknown type', () => {
      const service = new SvgTemplateService();
      expect(service.list('unknown')).toEqual([]);
    });
  });

  describe('getByType', () => {
    it('returns the first template matching the type', () => {
      const service = new SvgTemplateService();
      const tpl = service.getByType('menu_card');
      expect(tpl).toBeDefined();
      expect(tpl!.id).toBe('menu-card-standard');
    });

    it('returns undefined for unknown type', () => {
      const service = new SvgTemplateService();
      expect(service.getByType('unknown')).toBeUndefined();
    });
  });

  describe('register', () => {
    it('adds a new template to the registry', () => {
      const service = new SvgTemplateService();
      const before = service.list().length;
      service.register({
        id: 'custom-card',
        name: '自定义卡片',
        type: 'custom',
        width: 800,
        height: 600,
        textPositions: []
      });
      expect(service.list()).toHaveLength(before + 1);
      expect(service.get('custom-card')).toBeDefined();
    });

    it('overwrites an existing template with the same id', () => {
      const service = new SvgTemplateService();
      service.register({
        id: 'vow-card-standard',
        name: '覆盖誓言卡',
        type: 'vow_card',
        width: 800,
        height: 600,
        textPositions: []
      });
      expect(service.get('vow-card-standard')!.name).toBe('覆盖誓言卡');
    });
  });

  describe('default templates', () => {
    it('each default template has required fields and at least one textPosition', () => {
      const service = new SvgTemplateService();
      for (const tpl of service.list()) {
        expect(tpl.id).toBeTruthy();
        expect(tpl.name).toBeTruthy();
        expect(tpl.type).toBeTruthy();
        expect(tpl.width).toBeGreaterThan(0);
        expect(tpl.height).toBeGreaterThan(0);
        expect(tpl.textPositions.length).toBeGreaterThan(0);
        for (const pos of tpl.textPositions) {
          expect(pos.id).toBeTruthy();
          expect(pos.label).toBeTruthy();
          expect(typeof pos.x).toBe('number');
          expect(typeof pos.y).toBe('number');
          expect(pos.fontSize).toBeGreaterThan(0);
        }
      }
    });
  });
});
