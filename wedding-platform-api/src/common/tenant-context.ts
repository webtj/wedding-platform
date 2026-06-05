import { BusinessException } from './exceptions/business.exception';
import type { AuthContext } from './auth/auth-context';

export interface TenantContext {
  tenantId: string;
  userId: string;
  memberId: string;
}

export function getTenantContext(request: any): TenantContext {
  if (!request.tenantContext) {
    throw new Error('Tenant context not available. Ensure TenantContextInterceptor is applied.');
  }
  return request.tenantContext;
}

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
