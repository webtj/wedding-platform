import { BusinessException } from './exceptions/business.exception';
import type { AuthContext } from './auth/auth-context';

export function requireTenant(auth: AuthContext | undefined) {
  if (!auth?.tenantId || !auth.memberId) {
    throw new BusinessException('TENANT_REQUIRED', '请先选择工作空间', 403);
  }
  return {
    userId: auth.userId,
    tenantId: auth.tenantId,
    memberId: auth.memberId,
  };
}
