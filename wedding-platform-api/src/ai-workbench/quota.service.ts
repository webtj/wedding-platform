import { Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';

interface QuotaConfig {
  windowHours: number;
  limit: number;
  weeklyLimit: number;
}

const DEFAULT_QUOTA: QuotaConfig = {
  windowHours: 5,
  limit: 50,
  weeklyLimit: 1000
};

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async checkQuota(tenantId: string, userId: string): Promise<void> {
    const quota = await this.getQuotaConfig();

    const windowStart = new Date(Date.now() - quota.windowHours * 60 * 60 * 1000);
    const windowUsage = await this.prisma.aiUsageRecord.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: windowStart }
      }
    });

    if (windowUsage >= quota.limit) {
      throw new BusinessException('AI_QUOTA_INSUFFICIENT',
        `AI 生成已达 ${quota.windowHours} 小时内 ${quota.limit} 次上限，请稍后再试。`, 403);
    }

    const weekStart = this.getWeekStart();
    const weeklyUsage = await this.prisma.aiUsageRecord.count({
      where: {
        tenantId,
        userId,
        createdAt: { gte: weekStart }
      }
    });

    if (weeklyUsage >= quota.weeklyLimit) {
      throw new BusinessException('AI_QUOTA_INSUFFICIENT', 'AI 生成已达本周上限。', 403);
    }
  }

  async recordUsage(tenantId: string, userId: string, action: string, metadata?: Record<string, unknown>) {
    await this.prisma.aiUsageRecord.create({
      data: { tenantId, userId, action, metadata: metadata as any }
    });
  }

  async getUsageStats(tenantId: string, userId: string) {
    const quota = await this.getQuotaConfig();
    const windowStart = new Date(Date.now() - quota.windowHours * 60 * 60 * 1000);
    const weekStart = this.getWeekStart();

    const [windowUsage, weeklyUsage] = await Promise.all([
      this.prisma.aiUsageRecord.count({
        where: { tenantId, userId, createdAt: { gte: windowStart } }
      }),
      this.prisma.aiUsageRecord.count({
        where: { tenantId, userId, createdAt: { gte: weekStart } }
      })
    ]);

    return {
      windowHours: quota.windowHours,
      hourlyUsed: windowUsage,
      hourlyLimit: quota.limit,
      hourlyRemaining: Math.max(0, quota.limit - windowUsage),
      weeklyUsed: weeklyUsage,
      weeklyLimit: quota.weeklyLimit,
      weeklyRemaining: Math.max(0, quota.weeklyLimit - weeklyUsage)
    };
  }

  private async getQuotaConfig(): Promise<QuotaConfig> {
    try {
      const setting = await this.prisma.platformSetting.findUnique({
        where: { key: 'ai.quota' }
      });
      if (setting?.value && typeof setting.value === 'object') {
        const raw = setting.value as Partial<QuotaConfig>;
        return {
          windowHours: Number(raw.windowHours) > 0 ? Number(raw.windowHours) : DEFAULT_QUOTA.windowHours,
          limit: Number(raw.limit) > 0 ? Number(raw.limit) : DEFAULT_QUOTA.limit,
          weeklyLimit: Number(raw.weeklyLimit) > 0 ? Number(raw.weeklyLimit) : DEFAULT_QUOTA.weeklyLimit
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to load ai.quota setting: ${error}`);
    }
    return DEFAULT_QUOTA;
  }

  private getWeekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }
}
