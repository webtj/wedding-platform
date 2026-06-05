import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateAccountInput, UpdateAccountInput } from '@wedding/shared';
import { BusinessException } from '../common/exceptions/business.exception';
import type { AuthContext } from '../common/auth/auth-context';
import { PasswordService } from '../identity/password.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService
  ) {}

  async list(params: { auth: AuthContext; search?: string; roleCode?: string; page?: number; pageSize?: number }) {
    const tenantId = params.auth.tenantId;
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (params.search) {
      where.OR = [
        { displayName: { contains: params.search } },
        { authAccounts: { some: { identifier: { contains: params.search } } } }
      ];
    }

    const memberConditions: Record<string, unknown> = { tenantId };
    if (params.roleCode) memberConditions.roles = { some: { role: { code: params.roleCode } } };
    where.tenantMembers = { some: memberConditions };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          authAccounts: { where: { provider: 'password' }, select: { identifier: true } },
          tenantMembers: {
            include: {
              tenant: { select: { id: true, name: true } },
              roles: { include: { role: { select: { id: true, code: true, name: true } } } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      this.prisma.user.count({ where })
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(auth: AuthContext, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        authAccounts: { where: { provider: 'password' }, select: { identifier: true } },
        tenantMembers: {
          include: {
            roles: { include: { role: { select: { id: true, code: true, name: true } } } }
          }
        }
      }
    });
    if (!user) { throw new NotFoundException('用户不存在'); }
    return user;
  }

  async listTenantsForFilter(auth: AuthContext) {
    // Platform admins see all tenants
    const where = auth.isPlatformAdmin ? {} : { id: auth.tenantId! };
    return this.prisma.tenant.findMany({ where, select: { id: true, name: true } });
  }

  async listRolesForFilter(auth: AuthContext) {
    // Platform admins see all roles
    const where = auth.isPlatformAdmin ? {} : { tenantId: auth.tenantId! };
    return this.prisma.role.findMany({
      where,
      select: { id: true, code: true, name: true },
      distinct: ['code'],
      orderBy: { code: 'asc' }
    });
  }

  async create(auth: AuthContext, data: CreateAccountInput) {
    const existing = await this.prisma.authAccount.findUnique({
      where: { provider_identifier: { provider: 'password', identifier: data.identifier } }
    });
    if (existing) { throw new ConflictException('账号标识已存在'); }
    const passwordHash = await this.passwordService.hash(data.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          displayName: data.displayName,
          authAccounts: { create: { provider: 'password', identifier: data.identifier, passwordHash } }
        }
      });
      const tenant = await tx.tenant.findUnique({ where: { id: data.tenantId } });
      if (!tenant) throw new NotFoundException('Tenant not found');
      const member = await tx.tenantMember.create({
        data: { tenantId: tenant.id, userId: user.id, displayName: data.displayName }
      });
      if (data.roleIds.length > 0) {
        await tx.memberRole.createMany({
          data: data.roleIds.map((roleId) => ({ memberId: member.id, roleId }))
        });
      }
      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          authAccounts: { where: { provider: 'password' }, select: { identifier: true } },
          tenantMembers: {
            include: {
              tenant: { select: { id: true, name: true } },
              roles: { include: { role: { select: { id: true, code: true, name: true } } } }
            }
          }
        }
      });
    });
  }

  async update(auth: AuthContext, input: { userId: string; data: UpdateAccountInput }) {
    const user = await this.prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) { throw new NotFoundException('用户不存在'); }
    const { password, roleIds, ...userData } = input.data;
    if (password) {
      const passwordHash = await this.passwordService.hash(password);
      const authAccount = await this.prisma.authAccount.findFirst({ where: { userId: input.userId, provider: 'password' } });
      if (authAccount) {
        await this.prisma.authAccount.update({ where: { id: authAccount.id }, data: { passwordHash } });
      }
    }
    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({ where: { id: input.userId }, data: userData });
    }
    if (roleIds && auth.tenantId) {
      const member = await this.prisma.tenantMember.findFirst({ where: { userId: input.userId, tenantId: auth.tenantId, status: 'active' } });
      if (member) {
        await this.prisma.memberRole.deleteMany({ where: { memberId: member.id } });
        if (roleIds.length > 0) {
          await this.prisma.memberRole.createMany({ data: roleIds.map((roleId) => ({ memberId: member.id, roleId })) });
        }
      }
    }
    return this.getById(auth, input.userId);
  }

  async delete(auth: AuthContext, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) { throw new NotFoundException('用户不存在'); }
    return this.prisma.user.delete({ where: { id: userId } });
  }
}
