import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiTemplatesService } from './ai-templates.service';

describe('AiTemplatesService', () => {
  describe('list', () => {
    it('queries built-in + tenant templates with optional category', async () => {
      const prisma = { aiTemplate: { findMany: vi.fn().mockResolvedValue([]) } };
      const service = new AiTemplatesService(prisma as never);
      await service.list({ tenantId: 't1', category: 'image_design' });
      expect(prisma.aiTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ tenantId: null }, { tenantId: 't1' }],
          category: 'image_design'
        },
        orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'asc' }]
      });
    });
  });

  describe('create', () => {
    it('throws BadRequest when code already exists', async () => {
      const prisma = {
        aiTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 't1' }), create: vi.fn() }
      };
      const service = new AiTemplatesService(prisma as never);
      await expect(
        service.create({ tenantId: 't1', data: { code: 'dup', name: 'N', category: 'image_design', prompt: 'P' } })
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a tenant template with isBuiltIn=false', async () => {
      const prisma = {
        aiTemplate: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'tpl1' })
        }
      };
      const service = new AiTemplatesService(prisma as never);
      await service.create({ tenantId: 't1', data: { code: 'custom', name: '自定义', category: 'image_design', prompt: 'P' } });
      expect(prisma.aiTemplate.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', code: 'custom', name: '自定义', category: 'image_design', prompt: 'P', isBuiltIn: false }
      });
    });
  });

  describe('update', () => {
    it('throws NotFound when template does not exist', async () => {
      const prisma = { aiTemplate: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new AiTemplatesService(prisma as never);
      await expect(service.update({ tenantId: 't1', templateId: 'missing', data: {} })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest for built-in templates', async () => {
      const prisma = { aiTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 't1', isBuiltIn: true, tenantId: null }) } };
      const service = new AiTemplatesService(prisma as never);
      await expect(service.update({ tenantId: 't1', templateId: 't1', data: {} })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when tenant mismatch', async () => {
      const prisma = { aiTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 't1', isBuiltIn: false, tenantId: 'other' }) } };
      const service = new AiTemplatesService(prisma as never);
      await expect(service.update({ tenantId: 't1', templateId: 't1', data: {} })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates when tenant matches and not built-in', async () => {
      const prisma = {
        aiTemplate: {
          findUnique: vi.fn().mockResolvedValue({ id: 't1', isBuiltIn: false, tenantId: 't1' }),
          update: vi.fn().mockResolvedValue({ id: 't1' })
        }
      };
      const service = new AiTemplatesService(prisma as never);
      await service.update({ tenantId: 't1', templateId: 't1', data: { name: '新名' } });
      expect(prisma.aiTemplate.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { name: '新名' } });
    });
  });

  describe('delete', () => {
    it('throws NotFound when template does not exist', async () => {
      const prisma = { aiTemplate: { findUnique: vi.fn().mockResolvedValue(null) } };
      const service = new AiTemplatesService(prisma as never);
      await expect(service.delete({ tenantId: 't1', templateId: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest for built-in templates', async () => {
      const prisma = { aiTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 't1', isBuiltIn: true, tenantId: null }) } };
      const service = new AiTemplatesService(prisma as never);
      await expect(service.delete({ tenantId: 't1', templateId: 't1' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequest when tenant mismatch', async () => {
      const prisma = { aiTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 't1', isBuiltIn: false, tenantId: 'other' }) } };
      const service = new AiTemplatesService(prisma as never);
      await expect(service.delete({ tenantId: 't1', templateId: 't1' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes when tenant matches and not built-in', async () => {
      const prisma = {
        aiTemplate: {
          findUnique: vi.fn().mockResolvedValue({ id: 't1', isBuiltIn: false, tenantId: 't1' }),
          delete: vi.fn().mockResolvedValue({})
        }
      };
      const service = new AiTemplatesService(prisma as never);
      const result = await service.delete({ tenantId: 't1', templateId: 't1' });
      expect(result).toEqual({ deleted: true });
      expect(prisma.aiTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });
  });
});
