import { Injectable, Logger } from '@nestjs/common';
import { AI_GENERATION_STATUS } from '@wedding/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface MetricSummary {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  successRate: number;
  avgLatencyMs: number;
  totalCost: number;
  byProvider: Record<string, {
    count: number;
    successRate: number;
    avgLatencyMs: number;
  }>;
  byMaterialType: Record<string, number>;
  dailyUsage: Array<{ date: string; count: number }>;
}

@Injectable()
export class AiMetricsService {
  private readonly logger = new Logger(AiMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string, days: number = 30): Promise<MetricSummary> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get generations
    const generations = await this.prisma.aiGeneration.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      select: {
        status: true,
        metadata: true,
        createdAt: true,
        materialType: { select: { code: true } },
      },
    });

    const total = generations.length;
    const successful = generations.filter(g => g.status === AI_GENERATION_STATUS.COMPLETED).length;
    const failed = generations.filter(g => g.status === AI_GENERATION_STATUS.FAILED).length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    // Calculate by provider
    const byProvider: Record<string, any> = {};
    const byMaterialType: Record<string, number> = {};
    const dailyUsage: Record<string, number> = {};

    for (const gen of generations) {
      const provider = (gen.metadata as any)?.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, successCount: 0, totalLatency: 0 };
      }
      byProvider[provider].count++;
      if (gen.status === AI_GENERATION_STATUS.COMPLETED) byProvider[provider].successCount++;
      const latency = (gen.metadata as any)?.latencyMs || 0;
      byProvider[provider].totalLatency += latency;

      const materialCode = gen.materialType?.code || 'unknown';
      byMaterialType[materialCode] = (byMaterialType[materialCode] || 0) + 1;

      const dateKey = gen.createdAt.toISOString().split('T')[0] || 'unknown';
      dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + 1;
    }

    // Format provider stats
    const providerStats: Record<string, any> = {};
    for (const [provider, stats] of Object.entries(byProvider)) {
      providerStats[provider] = {
        count: stats.count,
        successRate: stats.count > 0 ? (stats.successCount / stats.count) * 100 : 0,
        avgLatencyMs: stats.count > 0 ? stats.totalLatency / stats.count : 0,
      };
    }

    // Calculate overall avgLatencyMs and totalCost from metadata
    let totalLatencyMs = 0;
    let latencyCount = 0;
    let totalCost = 0;
    for (const gen of generations) {
      const meta = gen.metadata as any;
      if (meta?.latencyMs != null) {
        totalLatencyMs += meta.latencyMs;
        latencyCount++;
      }
      if (meta?.cost != null) {
        totalCost += meta.cost;
      }
    }

    // Format daily usage
    const dailyArray = Object.entries(dailyUsage)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalGenerations: total,
      successfulGenerations: successful,
      failedGenerations: failed,
      successRate,
      avgLatencyMs: latencyCount > 0 ? totalLatencyMs / latencyCount : 0,
      totalCost,
      byProvider: providerStats,
      byMaterialType,
      dailyUsage: dailyArray,
    };
  }

  async recordFeedback(
    tenantId: string,
    userId: string,
    generationId: string,
    imageId: string | null,
    rating: number,
    reason?: string,
  ): Promise<void> {
    // Store feedback in a simple JSON file or database
    // For now, just log it
    this.logger.log(`Feedback recorded: generation=${generationId}, rating=${rating}, reason=${reason}`);
  }
}
