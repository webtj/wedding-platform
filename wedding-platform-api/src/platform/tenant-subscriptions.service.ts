import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpdateTenantSubscriptionInput } from '@wedding/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.tenantSubscription.findMany({
      include: { tenant: true, planPackage: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  upsert(tenantId: string, data: UpdateTenantSubscriptionInput) {
    return this.prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: {
        planPackageId: data.planPackageId, billingCycle: data.billingCycle, status: data.status,
        startsAt: new Date(data.startsAt),
        renewsAt: data.renewsAt ? new Date(data.renewsAt) : null,
        canceledAt: data.canceledAt ? new Date(data.canceledAt) : null
      },
      create: {
        tenantId, planPackageId: data.planPackageId, billingCycle: data.billingCycle, status: data.status,
        startsAt: new Date(data.startsAt),
        renewsAt: data.renewsAt ? new Date(data.renewsAt) : null,
        canceledAt: data.canceledAt ? new Date(data.canceledAt) : null
      },
      include: { tenant: true, planPackage: true }
    });
  }

  async usage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        projects: { select: { id: true } },
        members: { select: { id: true } },
        subscription: { include: { planPackage: true } }
      }
    });
    if (!tenant) { throw new NotFoundException('Tenant not found'); }

    const [assetSum, aiCreditsUsed] = await Promise.all([
      this.prisma.asset.aggregate({ where: { tenantId }, _sum: { sizeBytes: true } }),
      this.prisma.aiJob.count({ where: { tenantId } })
    ]);

    const storageBytes = Number(assetSum._sum.sizeBytes ?? 0);
    const limits = tenant.subscription?.planPackage
      ? { maxProjects: tenant.subscription.planPackage.maxProjects, maxMembers: tenant.subscription.planPackage.maxMembers, storageGb: tenant.subscription.planPackage.storageGb, aiCreditsMonthly: tenant.subscription.planPackage.aiCreditsMonthly }
      : { maxProjects: 0, maxMembers: 0, storageGb: 0, aiCreditsMonthly: 0 };

    return {
      tenantId, projectCount: tenant.projects.length, memberCount: tenant.members.length,
      storageBytes, aiCreditsUsed, limits,
      overLimit: {
        projects: limits.maxProjects > 0 && tenant.projects.length > limits.maxProjects,
        members: limits.maxMembers > 0 && tenant.members.length > limits.maxMembers,
        storage: limits.storageGb > 0 && storageBytes > limits.storageGb * 1024 * 1024 * 1024,
        ai: limits.aiCreditsMonthly > 0 && aiCreditsUsed > limits.aiCreditsMonthly
      }
    };
  }
}
