import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScenesController } from './scenes.controller';

// Mock services
const mockScenesService = {
  list: vi.fn(),
  get: vi.fn(),
  getByProject: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

const mockSceneAiService = {
  autoArrange: vi.fn(),
  suggestLayout: vi.fn(),
  generateSeatCards: vi.fn()
};

describe('ScenesController', () => {
  let controller: ScenesController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ScenesController(mockScenesService as any, mockSceneAiService as any);
  });

  describe('list', () => {
    it('should return paginated scenes', async () => {
      const mockResult = { items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      mockScenesService.list.mockResolvedValue(mockResult);

      const result = await controller.list(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        { page: '1', pageSize: '10' }
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('get', () => {
    it('should return a scene by id', async () => {
      const mockScene = { id: '1', name: 'Scene 1' };
      mockScenesService.get.mockResolvedValue(mockScene);

      const result = await controller.get(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        '1'
      );

      expect(result).toEqual(mockScene);
    });
  });

  describe('getByProject', () => {
    it('should return scene by project id', async () => {
      const mockScene = { id: '1', name: 'Scene 1', projectId: 'p1' };
      mockScenesService.getByProject.mockResolvedValue(mockScene);

      const result = await controller.getByProject(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        'p1'
      );

      expect(result).toEqual(mockScene);
    });
  });

  describe('create', () => {
    it('should create a new scene', async () => {
      const mockScene = { id: '1', name: 'New Scene' };
      mockScenesService.create.mockResolvedValue(mockScene);

      const result = await controller.create(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        { projectId: 'p1', name: 'New Scene', width: 20, height: 30, unit: 'meter' }
      );

      expect(result).toEqual(mockScene);
    });
  });

  describe('update', () => {
    it('should update an existing scene', async () => {
      const mockScene = { id: '1', name: 'Updated Scene' };
      mockScenesService.update.mockResolvedValue(mockScene);

      const result = await controller.update(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        '1',
        { name: 'Updated Scene' }
      );

      expect(result).toEqual(mockScene);
    });
  });

  describe('delete', () => {
    it('should delete an existing scene', async () => {
      mockScenesService.delete.mockResolvedValue({ deleted: true });

      const result = await controller.delete(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        '1'
      );

      expect(result).toEqual({ deleted: true });
    });
  });

  describe('autoArrange', () => {
    it('should auto-arrange seats', async () => {
      const mockResult = { tables: [], reasoning: 'Test' };
      mockSceneAiService.autoArrange.mockResolvedValue(mockResult);

      const result = await controller.autoArrange(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        '1',
        { guestList: [{ name: 'Guest 1' }], tableCount: 5, seatsPerTable: 10 }
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('suggestLayout', () => {
    it('should suggest layout', async () => {
      const mockResult = { suggestions: [] };
      mockSceneAiService.suggestLayout.mockResolvedValue(mockResult);

      const result = await controller.suggestLayout(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        '1',
        { venueWidth: 20, venueDepth: 30, guestCount: 100, style: 'round_tables', stagePosition: 'north' }
      );

      expect(result).toEqual(mockResult);
    });
  });

  describe('generateSeatCards', () => {
    it('should generate seat cards', async () => {
      const mockResult = { cards: [], totalRequested: 10, generated: 10, failed: 0 };
      mockSceneAiService.generateSeatCards.mockResolvedValue(mockResult);

      const result = await controller.generateSeatCards(
        { auth: { userId: 'u1', tenantId: 't1', memberId: 'm1', isPlatformAdmin: false, permissions: [] } },
        '1',
        { tableAssignments: [{ tableNumber: 1, guests: [{ name: 'Guest 1' }] }], style: 'elegant', language: 'zh' }
      );

      expect(result).toEqual(mockResult);
    });
  });
});
