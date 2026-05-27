import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireTenant } from './tenant-context';
import type { AuthContext } from './auth/auth-context';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      auth?: AuthContext;
      params: Record<string, string | undefined>;
    }>();
    const tenant = requireTenant(request.auth);
    const projectId = request.params.projectId;

    if (!projectId) {
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: tenant.userId }
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isPlatformAdmin) {
      return true;
    }

    const projectMember = await this.prisma.projectMember.findFirst({
      where: {
        tenantId: tenant.tenantId,
        projectId,
        userId: tenant.userId
      }
    });

    if (!projectMember) {
      throw new ForbiddenException('No project access');
    }

    return true;
  }
}
