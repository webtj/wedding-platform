import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../identity/token.service';
import { BusinessException } from '../exceptions/business.exception';
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
      throw new BusinessException('AUTH_TOKEN_INVALID', '登录凭证无效，请重新登录', 401);
    }

    const token = authorization.slice('Bearer '.length);
    let payload;
    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new BusinessException('AUTH_TOKEN_EXPIRED', '登录已过期，请重新登录', 401);
    }

    const currentVersion = await this.tokenService.getCachedTokenVersion(payload.sub);
    if (payload.tokenVersion !== currentVersion) {
      throw new BusinessException('AUTH_TOKEN_EXPIRED', '权限已变更，请重新登录', 401);
    }

    request.auth = {
      userId: payload.sub,
      tenantId: payload.tenantId ?? null,
      memberId: payload.memberId ?? null,
      isPlatformAdmin: payload.isPlatformAdmin ?? false,
      platformLevel: payload.platformLevel,
      permissions: payload.permissions ?? []
    };
    return true;
  }
}
