import { z } from 'zod';
import { loginRequestSchema } from '@wedding/shared';

export const loginDtoSchema = loginRequestSchema;
export type LoginDto = z.infer<typeof loginDtoSchema>;

export const refreshDtoSchema = z.object({
  refreshToken: z.string().min(1)
});
export type RefreshDto = z.infer<typeof refreshDtoSchema>;

export const switchTenantDtoSchema = z.object({
  /**
   * Target tenant ID. The caller MUST be an active member of that tenant.
   * Platform admins do not have a fallback path here — they have no business
   * acting on a tenant's data; their admin console is at /admin/*, not in
   * the studio. This keeps the data boundary strict.
   */
  tenantId: z.string().min(1),
  /**
   * Caller's previous refresh token. Required: switching tenant issues a new
   * token pair AND revokes the old session so a stale (potentially null-tenant)
   * JWT cannot be replayed. Forcing it through Zod prevents clients from
   * skipping the revoke and silently leaving the old session alive.
   */
  refreshToken: z.string().min(1)
});
export type SwitchTenantDto = z.infer<typeof switchTenantDtoSchema>;
