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
   * Caller's previous refresh token. Optional when using httpOnly cookie
   * auth (the controller reads from the cookie as a fallback). Accepted
   * for backward compatibility with body-based clients.
   */
  refreshToken: z.string().min(1).optional()
});
export type SwitchTenantDto = z.infer<typeof switchTenantDtoSchema>;
