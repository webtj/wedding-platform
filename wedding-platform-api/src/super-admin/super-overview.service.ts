import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlatformOverviewSummary {
  totals: {
    tenants: number;
    activeTenants: number;
    users: number;
    leads: number;
    projects: number;
    contracts: number;
    aiGenerations: number;
  };
  recentTenants: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    memberCount: number;
    projectCount: number;
  }>;
  recentUsers: Array<{
    id: string;
    displayName: string;
    createdAt: Date;
    tenantName: string | null;
    isPlatformAdmin: boolean;
  }>;
  aiUsageLast7Days: Array<{ date: string; count: number }>;
}

/**
 * Cross-tenant platform overview. Only callable by platform admins
 * (PlatformGuard on the controller). Aggregates data from all tenants
 * — there is no per-tenant filter.
 */
@Injectable()
export class SuperOverviewService {
  private readonly logger = new Logger(SuperOverviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<PlatformOverviewSummary> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      tenantCount,
      activeTenantCount,
      userCount,
      leadCount,
      projectCount,
      contractCount,
      recentTenantsRaw,
      recentUsersRaw,
      recentAiGenerations
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.user.count(),
      this.prisma.lead.count(),
      this.prisma.project.count(),
      this.prisma.contract.count(),
      this.prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { members: true, projects: true } } }
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          platformAdmin: { select: { level: true } },
          tenantMembers: { take: 1, include: { tenant: { select: { name: true } } } }
        }
      }),
      this.prisma.aiGeneration.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true }
      })
    ]);

    // Aggregate AI usage by day for the sparkline.
    const dailyUsage: Record<string, number> = {};
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]!;
      dailyUsage[key] = 0;
    }
    for (const gen of recentAiGenerations) {
      const key = gen.createdAt.toISOString().split('T')[0]!;
      if (key in dailyUsage) dailyUsage[key] = (dailyUsage[key] ?? 0) + 1;
    }
    const aiUsageLast7Days = Object.entries(dailyUsage).map(([date, count]) => ({
      date,
      count
    }));

    return {
      totals: {
        tenants: tenantCount,
        activeTenants: activeTenantCount,
        users: userCount,
        leads: leadCount,
        projects: projectCount,
        contracts: contractCount,
        aiGenerations: recentAiGenerations.length
      },
      recentTenants: recentTenantsRaw.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
        memberCount: t._count.members,
        projectCount: t._count.projects
      })),
      recentUsers: recentUsersRaw.map((u) => ({
        id: u.id,
        displayName: u.displayName,
        createdAt: u.createdAt,
        tenantName: u.tenantMembers[0]?.tenant?.name ?? null,
        isPlatformAdmin: !!u.platformAdmin
      })),
      aiUsageLast7Days
    };
  }
}
