import { describe, expect, it, vi } from 'vitest';
import { BusinessException } from '../common/exceptions/business.exception';
import { QuotaService } from './quota.service';

describe('QuotaService', () => {
  describe('checkQuota', () => {
    it('passes when window and weekly usage are below limits', async () => {
      const prisma = {
        aiUsageRecord: { count: vi.fn().mockResolvedValue(0) },
        platformSetting: { findUnique: vi.fn().mockResolvedValue(null) }
      };
      const service = new QuotaService(prisma as never);
      await expect(service.checkQuota('t1', 'u1')).resolves.toBeUndefined();
    });

    it('throws AI_QUOTA_INSUFFICIENT when window limit is reached', async () => {
      const prisma = {
        aiUsageRecord: { count: vi.fn().mockResolvedValue(50) },
        platformSetting: { findUnique: vi.fn().mockResolvedValue(null) }
      };
      const service = new QuotaService(prisma as never);
      await expect(service.checkQuota('t1', 'u1')).rejects.toBeInstanceOf(BusinessException);
    });

    it('throws AI_QUOTA_INSUFFICIENT when weekly limit is reached', async () => {
      const prisma = {
        aiUsageRecord: {
          count: vi.fn()
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(1000)
        },
        platformSetting: { findUnique: vi.fn().mockResolvedValue(null) }
      };
      const service = new QuotaService(prisma as never);
      await expect(service.checkQuota('t1', 'u1')).rejects.toBeInstanceOf(BusinessException);
    });

    it('uses custom quota config from platformSetting when available', async () => {
      const prisma = {
        aiUsageRecord: { count: vi.fn().mockResolvedValue(0) },
        platformSetting: {
          findUnique: vi.fn().mockResolvedValue({
            key: 'ai.quota',
            value: { windowHours: 1, limit: 5, weeklyLimit: 50 }
          })
        }
      };
      const service = new QuotaService(prisma as never);
      await service.checkQuota('t1', 'u1');
      expect(prisma.platformSetting.findUnique).toHaveBeenCalledWith({ where: { key: 'ai.quota' } });
    });

    it('falls back to defaults when platformSetting read fails', async () => {
      const prisma = {
        aiUsageRecord: { count: vi.fn().mockResolvedValue(0) },
        platformSetting: { findUnique: vi.fn().mockRejectedValue(new Error('db down')) }
      };
      const service = new QuotaService(prisma as never);
      await expect(service.checkQuota('t1', 'u1')).resolves.toBeUndefined();
    });
  });

  describe('recordUsage', () => {
    it('creates an aiUsageRecord with tenantId, userId, action, and metadata', async () => {
      const prisma = { aiUsageRecord: { create: vi.fn().mockResolvedValue({ id: 'ur1' }) } };
      const service = new QuotaService(prisma as never);
      await service.recordUsage('t1', 'u1', 'text_generate', { type: 'vows' });
      expect(prisma.aiUsageRecord.create).toHaveBeenCalledWith({
        data: { tenantId: 't1', userId: 'u1', action: 'text_generate', metadata: { type: 'vows' } }
      });
    });
  });

  describe('getUsageStats', () => {
    it('returns window and weekly usage with remaining counts', async () => {
      const prisma = {
        aiUsageRecord: {
          count: vi.fn()
            .mockResolvedValueOnce(10)
            .mockResolvedValueOnce(200)
        },
        platformSetting: { findUnique: vi.fn().mockResolvedValue(null) }
      };
      const service = new QuotaService(prisma as never);
      const result = await service.getUsageStats('t1', 'u1');
      expect(result.windowHours).toBe(5);
      expect(result.hourlyUsed).toBe(10);
      expect(result.hourlyLimit).toBe(50);
      expect(result.hourlyRemaining).toBe(40);
      expect(result.weeklyUsed).toBe(200);
      expect(result.weeklyLimit).toBe(1000);
      expect(result.weeklyRemaining).toBe(800);
    });

    it('returns 0 remaining when usage exceeds limit', async () => {
      const prisma = {
        aiUsageRecord: {
          count: vi.fn()
            .mockResolvedValueOnce(60)
            .mockResolvedValueOnce(1100)
        },
        platformSetting: { findUnique: vi.fn().mockResolvedValue(null) }
      };
      const service = new QuotaService(prisma as never);
      const result = await service.getUsageStats('t1', 'u1');
      expect(result.hourlyRemaining).toBe(0);
      expect(result.weeklyRemaining).toBe(0);
    });
  });
});
