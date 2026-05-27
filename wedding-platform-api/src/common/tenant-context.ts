import { ForbiddenException } from '@nestjs/common';
import type { AuthContext } from './auth/auth-context';

export function requireTenant(auth: AuthContext | undefined) {
  if (!auth?.tenantId || !auth.memberId) {
    throw new ForbiddenException('Tenant context is required');
  }
  return {
    userId: auth.userId,
    tenantId: auth.tenantId,
    memberId: auth.memberId
  };
}
