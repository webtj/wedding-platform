import { Injectable, NotFoundException } from '@nestjs/common';
import type { UpsertRetentionPolicyInput } from '@wedding/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

@Injectable()
export class RetentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  getPolicy(input: { tenantId: string; projectId: string }) {
    return this.prisma.assetRetentionPolicy.findFirst({
      where: { tenantId: input.tenantId, projectId: input.projectId }
    });
  }

  async upsertPolicy(input: { tenantId: string; userId: string; projectId: string; data: UpsertRetentionPolicyInput }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const policy = await this.prisma.assetRetentionPolicy.upsert({
      where: { projectId: input.projectId },
      update: input.data,
      create: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        ...input.data
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'retention_policy.upsert',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId }
    });
    return policy;
  }

  async generateReminders(input: { tenantId: string; userId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId },
      include: { retentionPolicy: true, assets: true }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const policy = project.retentionPolicy;
    if (!policy) {
      throw new NotFoundException('Retention policy not found');
    }
    const baseDate = project.completedAt ?? new Date();
    const expiresAt = addDays(baseDate, policy.retentionDays);
    const remindAt = addDays(expiresAt, -policy.notifyBeforeDays);

    await this.prisma.asset.updateMany({
      where: { tenantId: input.tenantId, projectId: input.projectId },
      data: { expiresAt }
    });

    await this.prisma.retentionReminder.deleteMany({
      where: { tenantId: input.tenantId, projectId: input.projectId, status: 'pending' }
    });

    const created = await this.prisma.retentionReminder.createMany({
      data: project.assets.map((asset) => ({
        tenantId: input.tenantId,
        projectId: input.projectId,
        assetId: asset.id,
        title: `${asset.filename} 将于 ${expiresAt.toISOString().slice(0, 10)} 到期`,
        remindAt
      }))
    });

    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'retention_reminders.generate',
      entity: 'project',
      entityId: input.projectId,
      metadata: { projectId: input.projectId, count: created.count }
    });
    return { count: created.count, expiresAt, remindAt };
  }

  listReminders(input: { tenantId: string }) {
    return this.prisma.retentionReminder.findMany({
      where: { tenantId: input.tenantId },
      include: { project: true, asset: true },
      orderBy: { remindAt: 'asc' },
      take: 100
    });
  }
}
