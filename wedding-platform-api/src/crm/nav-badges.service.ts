import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NavBadgeCount = { count: number };
export type NavBadgeMap = Record<string, NavBadgeCount>;

@Injectable()
export class NavBadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(tenantId: string): Promise<{ badges: NavBadgeMap }> {
    const [leadsNeedsFollowup] = await Promise.all([
      this.getLeadsNeedsFollowup(tenantId)
    ]);
    return {
      badges: {
        'leads-needs-followup': leadsNeedsFollowup
      }
    };
  }

  private async getLeadsNeedsFollowup(tenantId: string): Promise<NavBadgeCount> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const count = await this.prisma.lead.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ['won', 'lost'] },
        followups: {
          none: { createdAt: { gte: sevenDaysAgo } }
        }
      }
    });
    return { count };
  }
}
