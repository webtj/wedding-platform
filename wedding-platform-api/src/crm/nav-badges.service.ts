import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NavBadgeCount = { count: number };
export type NavBadgeMap = Record<string, NavBadgeCount>;

@Injectable()
export class NavBadgesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(tenantId: string): Promise<{ badges: NavBadgeMap }> {
    const [leadsNeedsFollowup, contractsPendingSign] = await Promise.all([
      this.getLeadsNeedsFollowup(tenantId),
      this.getContractsPendingSign(tenantId)
    ]);
    return {
      badges: {
        'leads-needs-followup': leadsNeedsFollowup,
        'contracts-pending-sign': contractsPendingSign
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

  private async getContractsPendingSign(tenantId: string): Promise<NavBadgeCount> {
    const count = await this.prisma.contract.count({
      where: { tenantId, status: 'pending_sign' }
    });
    return { count };
  }
}
