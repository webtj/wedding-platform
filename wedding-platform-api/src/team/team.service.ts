import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../identity/password.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService
  ) {}

  async listMembers(input: {
    tenantId: string;
    page?: number;
    pageSize?: number;
    search?: string;
    roleCode?: string;
  }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId: input.tenantId };

    if (input.search) {
      where.OR = [
        { displayName: { contains: input.search } },
        { user: { displayName: { contains: input.search } } },
        { user: { authAccounts: { some: { identifier: { contains: input.search } } } } }
      ];
    }

    if (input.roleCode) {
      where.roles = { some: { role: { code: input.roleCode } } };
    }

    const [items, total] = await Promise.all([
      this.prisma.tenantMember.findMany({
        where,
        include: {
          user: {
            include: {
              authAccounts: { where: { provider: 'password' }, select: { identifier: true } }
            }
          },
          roles: { include: { role: { select: { id: true, code: true, name: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.tenantMember.count({ where })
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
      include: {
        user: {
          include: {
            authAccounts: { where: { provider: 'password' }, select: { identifier: true } }
          }
        },
        roles: { include: { role: { select: { id: true, code: true, name: true } } } }
      }
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException('成员不存在');
    }
    return member;
  }

  async update(tenantId: string, id: string, input: UpdateMemberInput & { password?: string; roleIds?: string[] }) {
    const member = await this.prisma.tenantMember.findUnique({
      where: { id },
      include: { user: { include: { authAccounts: { where: { provider: 'password' } } } } }
    });
    if (!member || member.tenantId !== tenantId) {
      throw new NotFoundException('成员不存在');
    }

    // Update password if provided
    if (input.password) {
      const passwordHash = await this.passwordService.hash(input.password);
      const authAccount = member.user.authAccounts[0];
      if (authAccount) {
        await this.prisma.authAccount.update({
          where: { id: authAccount.id },
          data: { passwordHash }
        });
      }
    }

    // Update user displayName if provided
    if (input.displayName) {
      await this.prisma.user.update({
        where: { id: member.userId },
        data: { displayName: input.displayName }
      });
    }

    // Update roles if provided
    if (input.roleIds !== undefined) {
      await this.prisma.memberRole.deleteMany({ where: { memberId: id } });
      if (input.roleIds.length > 0) {
        await this.prisma.memberRole.createMany({
          data: input.roleIds.map((roleId) => ({ memberId: id, roleId }))
        });
      }
    }

    return this.prisma.tenantMember.update({
      where: { id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      },
      include: {
        user: {
          include: {
            authAccounts: { where: { provider: 'password' }, select: { identifier: true } }
          }
        },
        roles: { include: { role: { select: { id: true, code: true, name: true } } } }
      }
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

  async listRolesForFilter(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' }
    });
  }

  async createAccount(tenantId: string, data: {
    identifier: string;
    password: string;
    displayName: string;
    roleIds: string[];
  }) {
    const existing = await this.prisma.authAccount.findUnique({
      where: { provider_identifier: { provider: 'password', identifier: data.identifier } }
    });
    if (existing) {
      throw new ConflictException('账号标识已存在');
    }

    const passwordHash = await this.passwordService.hash(data.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          displayName: data.displayName,
          authAccounts: { create: { provider: 'password', identifier: data.identifier, passwordHash } }
        }
      });

      const member = await tx.tenantMember.create({
        data: { tenantId, userId: user.id, displayName: data.displayName }
      });

      if (data.roleIds.length > 0) {
        await tx.memberRole.createMany({
          data: data.roleIds.map((roleId) => ({ memberId: member.id, roleId }))
        });
      }

      return tx.tenantMember.findUniqueOrThrow({
        where: { id: member.id },
        include: {
          user: {
            include: {
              authAccounts: { where: { provider: 'password' }, select: { identifier: true } }
            }
          },
          roles: { include: { role: { select: { id: true, code: true, name: true } } } }
        }
      });
    });
  }
}
