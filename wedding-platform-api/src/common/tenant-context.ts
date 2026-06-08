import { BusinessException } from './exceptions/business.exception';
import type { AuthContext } from './auth/auth-context';

export interface TenantContext {
  userId: string;
  tenantId: string | null;
  memberId: string | null;
}

/**
 * Require a valid tenant context. Throws if user has no tenant membership.
 * Use for tenant-only endpoints (crm, projects, tasks, etc.)
 */
export function requireTenant(auth: AuthContext | undefined): TenantContext & { tenantId: string; memberId: string } {
  if (!auth?.tenantId || !auth.memberId) {
    throw new BusinessException('TENANT_REQUIRED', '请先选择工作空间', 403);
  }
  return {
    userId: auth.userId,
    tenantId: auth.tenantId,
    memberId: auth.memberId,
  };
}

/**
 * Get tenant context without throwing. Returns null tenantId for platform admins.
 * Use for shared endpoints where platform admins should see built-in data only
 * (materials, quick-prompts, overview, material-types).
 */
export function getTenantContext(auth: AuthContext | undefined): TenantContext {
  if (!auth) {
    throw new BusinessException('AUTH_TOKEN_INVALID', '请先登录', 401);
  }
  if (auth.isPlatformAdmin) {
    return { userId: auth.userId, tenantId: null, memberId: null };
  }
  if (!auth.tenantId || !auth.memberId) {
    throw new BusinessException('TENANT_REQUIRED', '请先选择工作空间', 403);
  }
  return { userId: auth.userId, tenantId: auth.tenantId, memberId: auth.memberId };
}
