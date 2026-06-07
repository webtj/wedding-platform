import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '@wedding/shared';
import { BusinessException } from '../exceptions/business.exception';
import { REQUIRED_PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ auth?: { isPlatformAdmin?: boolean; permissions?: string[] } }>();
    if (!request.auth) throw BusinessException.permissionDenied();

    // Platform admins bypass all permission checks
    if (request.auth.isPlatformAdmin) return true;

    const granted = new Set(request.auth.permissions ?? []);
    const ok = required.every((permission) => granted.has(permission));
    if (!ok) {
      // Tell the frontend which permissions were required so the 403 panel
      // can name them (otherwise the user only sees "权限不足" with no path
      // to resolution). `resource` is taken from the controller's class name
      // when available; the 403 panel can then map it to a friendly label.
      const controller = context.getClass();
      const resource = controller?.name?.replace(/Controller$/, '').replace(/(.)([A-Z])/g, '$1 $2').trim();
      throw BusinessException.permissionDenied({
        requiredPermissions: required,
        resource
      });
    }

    return true;
  }
}
