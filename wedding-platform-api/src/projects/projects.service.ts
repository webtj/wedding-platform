import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvitationStatus, MemberStatus, NotificationType, ProjectMemberRole } from '@prisma/client';
import { BUILT_IN_ROLES } from '@wedding/shared';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCoupleInvitationDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService
  ) {}

  listForUser(input: { tenantId: string; userId: string; isPlatformAdmin?: boolean }) {
    return this.prisma.project.findMany({
      where: { tenantId: input.tenantId },
      include: { members: true },
      orderBy: { weddingDate: 'asc' }
    });
  }

  async get(input: { tenantId: string; userId: string; projectId: string }) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: input.projectId,
        tenantId: input.tenantId
      },
      include: {
        members: { include: { user: true } },
        invitations: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { dueDate: 'asc' } },
        confirmations: { orderBy: { createdAt: 'desc' } },
        assets: { include: { annotations: true }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async createInvitation(input: {
    tenantId: string;
    userId: string;
    projectId: string;
    data: CreateCoupleInvitationDto;
  }) {
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId, tenantId: input.tenantId }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const invitation = await this.prisma.coupleInvitation.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        token: randomBytes(18).toString('hex'),
        invitedName: input.data.invitedName,
        invitedPhone: input.data.invitedPhone,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
      }
    });
    await this.audit.record({
      tenantId: input.tenantId,
      userId: input.userId,
      action: 'project.invitation.create',
      entity: 'project',
      entityId: input.projectId,
      metadata: { invitationId: invitation.id, projectId: input.projectId }
    });
    return invitation;
  }

  async acceptInvitation(input: { userId: string; token: string }) {
    const invitation = await this.prisma.coupleInvitation.findUnique({
      where: { token: input.token },
      include: { project: true }
    });
    if (!invitation || invitation.status !== InvitationStatus.pending || invitation.expiresAt.getTime() < Date.now()) {
      throw new ForbiddenException('Invalid invitation');
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.tenantMember.upsert({
        where: {
          tenantId_userId: {
            tenantId: invitation.tenantId,
            userId: input.userId
          }
        },
        update: {
          status: MemberStatus.active,
          displayName: invitation.invitedName
        },
        create: {
          tenantId: invitation.tenantId,
          userId: input.userId,
          displayName: invitation.invitedName
        }
      });
      const coupleRole = await tx.role.findFirst({
        where: {
          tenantId: invitation.tenantId,
          code: BUILT_IN_ROLES.COUPLE
        }
      });
      if (coupleRole) {
        await tx.memberRole.upsert({
          where: {
            memberId_roleId: {
              memberId: member.id,
              roleId: coupleRole.id
            }
          },
          update: {},
          create: {
            memberId: member.id,
            roleId: coupleRole.id
          }
        });
      }

      const projectMember = await tx.projectMember.upsert({
        where: {
          projectId_userId_role: {
            projectId: invitation.projectId,
            userId: input.userId,
            role: ProjectMemberRole.couple
          }
        },
        update: {
          memberId: member.id
        },
        create: {
          tenantId: invitation.tenantId,
          projectId: invitation.projectId,
          userId: input.userId,
          memberId: member.id,
          role: ProjectMemberRole.couple
        }
      });
      await tx.coupleInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.accepted,
          acceptedByUserId: input.userId,
          acceptedAt: new Date()
        }
      });
      await tx.notification.create({
        data: {
          tenantId: invitation.tenantId,
          userId: input.userId,
          type: NotificationType.system,
          title: '已加入婚礼项目',
          body: `${invitation.project.brideName} & ${invitation.project.groomName} 的婚礼项目已开通`,
          link: `/couple/projects/${invitation.projectId}`
        }
      });
      await tx.auditLog.create({
        data: {
          tenantId: invitation.tenantId,
          userId: input.userId,
          action: 'project.invitation.accept',
          entity: 'project',
          entityId: invitation.projectId,
          metadata: { invitationId: invitation.id, projectId: invitation.projectId }
        }
      });
      return projectMember;
    });
  }
}
