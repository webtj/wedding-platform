import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ auth?: { tenantId: string | null; memberId: string | null; userId: string } }>();

    if (!request.auth?.tenantId || !request.auth.memberId) {
      throw new ForbiddenException('Tenant membership is required');
    }

    const member = await this.prisma.tenantMember.findUnique({
      where: { id: request.auth.memberId }
    });

    if (!member || member.userId !== request.auth.userId || member.tenantId !== request.auth.tenantId) {
      throw new ForbiddenException('Invalid tenant membership');
    }

    return true;
  }
}
