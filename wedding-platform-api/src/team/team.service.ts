import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateMemberInput {
  tenantId: string;
  userId: string;
  displayName: string;
  status?: MemberStatus;
}

export interface UpdateMemberInput {
  displayName?: string;
  status?: MemberStatus;
}

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  listMembers(input: { tenantId: string }) {
    return this.prisma.tenantMember.findMany({
      where: { tenantId: input.tenantId },
      include: { user: true, roles: { include: { role: true } }, tenant: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(input: CreateMemberInput) {
    const existing = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId: input.tenantId, userId: input.userId } }
    });
    if (existing) {
      throw new ConflictException('用户已是团队成员');
    }

    return this.prisma.tenantMember.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        displayName: input.displayName,
        status: input.status ?? MemberStatus.active
      },
      include: { user: true, roles: { include: { role: true } } }
    });
  }

  async getById(tenantId: string, id: string) {
    const member = await this.prisma.tenantMember.findUnique({
      where: { id },
      include: { user: true, roles: { include: { role: true } } }
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException('成员不存在');
    }
    return member;
  }

  async update(tenantId: string, id: string, input: UpdateMemberInput) {
    const member = await this.prisma.tenantMember.findUnique({ where: { id } });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException('成员不存在');
    }

    return this.prisma.tenantMember.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      },
      include: { user: true, roles: { include: { role: true } } }
    });
  }

  async delete(tenantId: string, id: string) {
    const member = await this.prisma.tenantMember.findUnique({ where: { id } });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException('成员不存在');
    }

    await this.prisma.tenantMember.delete({ where: { id } });
    return { deleted: true };
  }
}
