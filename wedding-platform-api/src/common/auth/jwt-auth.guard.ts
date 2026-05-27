import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../identity/token.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { AuthContext } from './auth-context';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; auth?: AuthContext }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authorization.slice('Bearer '.length);
    let payload;
    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    request.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      memberId: payload.memberId
    };
    return true;
  }
}
