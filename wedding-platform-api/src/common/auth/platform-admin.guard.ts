import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ auth?: { userId: string } }>();
    if (!request.auth) {
      throw new ForbiddenException('Missing auth context');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: request.auth.userId }
    });

    if (!user.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator access is required');
    }

    return true;
  }
}
