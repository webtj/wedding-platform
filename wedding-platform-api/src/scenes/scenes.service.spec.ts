import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ScenesService } from './scenes.service';

describe('ScenesService', () => {
  describe('list', () => {
    it('paginates with optional projectId filter', async () => {
      const prisma = {
        scene: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) }
      };
      const service = new ScenesService(prisma as never);
      await service.list('t1', { projectId: 'p1', page: 2, pageSize: 5 } as never);
      expect(prisma.scene.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't1', projectId: 'p1' },
          skip: 5, take: 5
        })
      );
    });
  });

  describe('get', () => {
    it('returns scene with project select', async () => {
      const scene = { id: 's1', tenantId: 't1' };
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(scene) } };
      const service = new ScenesService(prisma as never);
      expect(await service.get('t1', 's1')).toEqual(scene);
    });

    it('throws NotFound when missing', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ScenesService(prisma as never);
      await expect(service.get('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getByProject', () => {
    it('returns the latest scene for a project', async () => {
      const scene = { id: 's1' };
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(scene) } };
      const service = new ScenesService(prisma as never);
      expect(await service.getByProject('t1', 'p1')).toEqual(scene);
    });

    it('returns null when no scene exists', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ScenesService(prisma as never);
      expect(await service.getByProject('t1', 'p1')).toBeNull();
    });
  });

  describe('create', () => {
    it('throws NotFound when project does not exist', async () => {
      const prisma = { project: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ScenesService(prisma as never);
      await expect(service.create('t1', { projectId: 'p1', name: 'N', width: 10, height: 10, unit: 'm' } as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a scene with DEFAULT_SCENE_DATA merged with project venue', async () => {
      const project = { id: 'p1', venue: '花园' };
      const prisma = {
        project: { findFirst: vi.fn().mockResolvedValue(project) },
        scene: { create: vi.fn().mockResolvedValue({ id: 's1' }) }
      };
      const service = new ScenesService(prisma as never);
      await service.create('t1', { projectId: 'p1', name: '婚礼现场', width: 20, height: 15, unit: 'm' } as never);

      expect(prisma.scene.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1', projectId: 'p1', name: '婚礼现场', width: 20, height: 15, unit: 'm',
          sceneData: expect.objectContaining({
            version: '1.0.0',
            venue: expect.objectContaining({ name: '花园', width: 20, depth: 15 })
          })
        })
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when scene does not exist', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ScenesService(prisma as never);
      await expect(service.update('t1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates only provided fields and increments version when sceneData changes', async () => {
      const prisma = {
        scene: {
          findFirst: vi.fn().mockResolvedValue({ id: 's1' }),
          update: vi.fn().mockResolvedValue({ id: 's1' })
        }
      };
      const service = new ScenesService(prisma as never);
      await service.update('t1', 's1', { name: '新名', sceneData: { foo: 'bar' } as never });
      expect(prisma.scene.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({
          name: '新名',
          sceneData: { foo: 'bar' },
          version: { increment: 1 }
        })
      });
    });
  });

  describe('delete', () => {
    it('throws NotFound when scene does not exist', async () => {
      const prisma = { scene: { findFirst: vi.fn().mockResolvedValue(null) } };
      const service = new ScenesService(prisma as never);
      await expect(service.delete('t1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes the scene', async () => {
      const prisma = {
        scene: {
          findFirst: vi.fn().mockResolvedValue({ id: 's1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new ScenesService(prisma as never);
      const result = await service.delete('t1', 's1');
      expect(result).toEqual({ deleted: true });
      expect(prisma.scene.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });
  });
});
