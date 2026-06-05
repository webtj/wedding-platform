import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';

/**
 * Guard for platform-only endpoints.
 * Checks that the authenticated user is a PlatformAdmin.
 * Use on super-admin controllers.
 */
@Injectable()
export class PlatformGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ auth?: { isPlatformAdmin?: boolean } }>();
    if (request.auth?.isPlatformAdmin) return true;
    throw BusinessException.permissionDenied();
  }
}
