import { describe, expect, it } from 'vitest';
import { DesignStateService } from './design-state.service';

describe('DesignStateService', () => {
  describe('createInitialState', () => {
    it('returns a state with version, default constraints, and empty style', () => {
      const service = new DesignStateService();
      const state = service.createInitialState();
      expect(state.version).toBe(1);
      expect(state.currentStyle).toEqual([]);
      expect(state.negativeConstraints).toEqual(['no watermark', 'no messy layout', 'no wrong text']);
      expect(state.preserveRules).toEqual({});
    });

    it('wraps projectStyle in an array when provided', () => {
      const service = new DesignStateService();
      const state = service.createInitialState('romantic');
      expect(state.currentStyle).toEqual(['romantic']);
    });
  });

  describe('updateState', () => {
    it('merges updates into current state and bumps version', () => {
      const service = new DesignStateService();
      const current = service.createInitialState();
      const updated = service.updateState(current, {
        currentMaterialType: 'vow_card',
        currentStyle: ['elegant']
      });
      expect(updated.currentMaterialType).toBe('vow_card');
      expect(updated.currentStyle).toEqual(['elegant']);
      expect(updated.version).toBe(1);
    });

    it('merges preserveRules shallowly', () => {
      const service = new DesignStateService();
      const current = { ...service.createInitialState(), preserveRules: { preserveLayout: true } };
      const updated = service.updateState(current, { preserveRules: { preserveSubject: true } });
      expect(updated.preserveRules).toEqual({ preserveLayout: true, preserveSubject: true });
    });
  });

  describe('addReferenceImage', () => {
    it('appends to referenceImages array', () => {
      const service = new DesignStateService();
      const state = service.addReferenceImage(service.createInitialState(), 'img1', 'style_ref');
      expect(state.referenceImages).toEqual([{ id: 'img1', role: 'style_ref' }]);
    });

    it('initializes array when undefined', () => {
      const service = new DesignStateService();
      const state = service.addReferenceImage({} as never, 'img1', 'ref');
      expect(state.referenceImages).toEqual([{ id: 'img1', role: 'ref' }]);
    });
  });

  describe('addSubjectImage', () => {
    it('appends to subjectImages array', () => {
      const service = new DesignStateService();
      const state = service.addSubjectImage(service.createInitialState(), 'img2', 'subject');
      expect(state.subjectImages).toEqual([{ id: 'img2', role: 'subject' }]);
    });
  });

  describe('setCurrentImage', () => {
    it('sets currentImageId', () => {
      const service = new DesignStateService();
      const state = service.setCurrentImage(service.createInitialState(), 'img3');
      expect(state.currentImageId).toBe('img3');
    });
  });

  describe('setMaterialType', () => {
    it('sets currentMaterialType', () => {
      const service = new DesignStateService();
      const state = service.setMaterialType(service.createInitialState(), 'menu_card');
      expect(state.currentMaterialType).toBe('menu_card');
    });
  });

  describe('toJSON', () => {
    it('returns the state as-is', () => {
      const service = new DesignStateService();
      const state = service.createInitialState();
      expect(service.toJSON(state)).toBe(state);
    });
  });

  describe('fromJSON', () => {
    it('parses valid data and returns typed state', () => {
      const service = new DesignStateService();
      const state = service.fromJSON({ version: 1, currentMaterialType: 'vow_card' });
      expect(state.currentMaterialType).toBe('vow_card');
      expect(state.version).toBe(1);
    });

    it('returns initial state for invalid data', () => {
      const service = new DesignStateService();
      const state = service.fromJSON({ version: 'invalid' });
      expect(state.version).toBe(1);
      expect(state.negativeConstraints).toBeDefined();
    });

    it('migrates older versions to CURRENT_VERSION', () => {
      const service = new DesignStateService();
      const state = service.fromJSON({ version: 0 });
      expect(state.version).toBe(1);
    });

    it('returns initial state for completely malformed input', () => {
      const service = new DesignStateService();
      const state = service.fromJSON(null);
      expect(state.version).toBe(1);
    });
  });
});
