import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SceneAiService } from './scene-ai.service';

const buildSettings = () => ({
  getByGroup: vi.fn().mockResolvedValue([
    { key: 'ai.features', value: { text2img: true, img2img: true } }
  ])
});

const buildLlm = () => ({
  chat: vi.fn().mockResolvedValue(JSON.stringify({
    tables: [
      { tableNumber: 1, tableName: 'VIP桌', guests: [{ name: '张三', group: 'family', seatPosition: 1 }], position: { x: 5, y: 3 } }
    ],
    reasoning: 'VIP 放前排'
  }))
});

const buildImage = () => ({
  generate: vi.fn().mockResolvedValue({ images: ['img.png'], metadata: {} })
});

const buildStorage = () => ({
  upload: vi.fn().mockResolvedValue({ url: 'http://api/uploads/scene.png', key: 't1/scene.png', size: 1024 }),
  download: vi.fn().mockResolvedValue(Buffer.from('scene-data'))
});

describe('SceneAiService', () => {
  describe('autoArrange', () => {
    it('throws NotFound when scene does not exist', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new SceneAiService(
        prisma as never, buildLlm() as never, buildImage() as never, buildStorage() as never, buildSettings() as never
      );
      await expect(
        service.autoArrange({ tenantId: 't1', sceneId: 'missing', data: { guestGroups: [] } } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('calls LLM with guest list and scene info, returns parsed result', async () => {
      const scene = {
        id: 's1', name: '宴会厅', width: 20, height: 15, unit: 'm',
        sceneData: { venue: { width: 20, depth: 15 } },
        project: { id: 'p1', brideName: '新娘', groomName: '新郎' }
      };
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(scene) } };
      const llm = buildLlm();
      const service = new SceneAiService(
        prisma as never, llm as never, buildImage() as never, buildStorage() as never, buildSettings() as never
      );

      const result = await service.autoArrange('t1', 's1', {
        guestList: [{ name: '张三', group: 'family' }],
        tableCount: 1,
        seatsPerTable: 10
      } as never);

      expect(llm.chat).toHaveBeenCalled();
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].tableNumber).toBe(1);
    });
  });

  describe('suggestLayout', () => {
    it('throws NotFound when scene does not exist', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new SceneAiService(
        prisma as never, buildLlm() as never, buildImage() as never, buildStorage() as never, buildSettings() as never
      );
      await expect(
        service.suggestLayout({ tenantId: 't1', sceneId: 'missing', data: {} } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns layout suggestions from LLM', async () => {
      const scene = {
        id: 's1', name: '宴会厅', width: 20, height: 15, unit: 'm',
        sceneData: { venue: { width: 20, depth: 15 } }
      };
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(scene) } };
      const llm = buildLlm();
      llm.chat = vi.fn().mockResolvedValue(JSON.stringify({
        suggestions: [{ name: '布局A', tables: [], description: 'des' }],
        reasoning: 'VIP 放前排'
      }));
      const service = new SceneAiService(
        prisma as never, llm as never, buildImage() as never, buildStorage() as never, buildSettings() as never
      );

      const result = await service.suggestLayout('t1', 's1', {
        venueWidth: 20, venueDepth: 15, guestCount: 50, style: 'round', stagePosition: 'north'
      } as never);

      expect(result.suggestions).toBeDefined();
    });
  });

  describe('generateSeatCards', () => {
    it('throws NotFound when scene does not exist', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new SceneAiService(
        prisma as never, buildLlm() as never, buildImage() as never, buildStorage() as never, buildSettings() as never
      );
      await expect(
        service.generateSeatCards({ tenantId: 't1', sceneId: 'missing', data: { tables: [] } } as never)
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('generates seat card images for each table assignment', async () => {
      const scene = {
        id: 's1', name: '宴会厅', width: 20, height: 15, unit: 'm',
        sceneData: { venue: { width: 20, depth: 15 } },
        project: { id: 'p1', brideName: '新娘', groomName: '新郎' }
      };
      const prisma = {
        scene: {
          findFirst: vi.fn().mockResolvedValue(scene),
          update: vi.fn().mockResolvedValue({})
        }
      };
      const image = buildImage();
      const storage = buildStorage();
      const service = new SceneAiService(
        prisma as never, buildLlm() as never, image as never, storage as never, buildSettings() as never
      );

      const result = await service.generateSeatCards('t1', 's1', {
        tableAssignments: [{
          tableNumber: 1,
          tableName: 'VIP桌',
          guests: [{ name: '张三', group: 'family', seatPosition: 1 }]
        }],
        style: 'elegant'
      } as never);

      expect(result.cards).toBeDefined();
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].tableNumber).toBe(1);
      expect(result.cards[0].imageUrl).toBeDefined();
    });
  });
});
