import { Injectable } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async pipeline(input: { tenantId: string }) {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId: input.tenantId,
        status: { not: LeadStatus.won }
      },
      include: {
        followups: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const groups = {
      new: [],
      contacted: [],
      proposal: [],
      signed: [],
      lost: []
    } as Record<string, typeof leads>;

    for (const lead of leads) {
      groups[lead.status]?.push(lead);
    }

    return groups;
  }

  overdueFollowups(input: { tenantId: string; now?: Date }) {
    return this.prisma.leadFollowup.findMany({
      where: {
        tenantId: input.tenantId,
        nextFollowUpAt: {
          lt: input.now ?? new Date()
        },
        lead: {
          status: {
            notIn: [LeadStatus.won, LeadStatus.lost]
          }
        }
      },
      include: {
        lead: true
      },
      orderBy: { nextFollowUpAt: 'asc' },
      take: 100
    });
  }
}
