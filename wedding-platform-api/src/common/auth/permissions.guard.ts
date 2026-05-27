import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@wedding/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ auth?: { userId: string; memberId: string | null } }>();
    if (!request.auth) {
      throw new ForbiddenException('Missing auth context');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: request.auth.userId }
    });

    if (user.isPlatformAdmin) {
      return true;
    }

    if (!request.auth.memberId) {
      throw new ForbiddenException('Tenant membership is required');
    }

    const member = await this.prisma.tenantMember.findUniqueOrThrow({
      where: { id: request.auth.memberId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const granted = new Set(
      member.roles.flatMap((memberRole) =>
        memberRole.role.permissions.map((rolePermission) => rolePermission.permission.code)
      )
    );

    const ok = required.every((permission) => granted.has(permission));
    if (!ok) {
      throw new ForbiddenException('Missing required permission');
    }

    return true;
  }
}
