import { z } from 'zod';
import { loginRequestSchema } from '@wedding/shared';

export const loginDtoSchema = loginRequestSchema;
export type LoginDto = z.infer<typeof loginDtoSchema>;

export const refreshDtoSchema = z.object({
  refreshToken: z.string().min(1)
});
export type RefreshDto = z.infer<typeof refreshDtoSchema>;

export const switchTenantDtoSchema = z.object({
  tenantId: z.string().min(1)
});
export type SwitchTenantDto = z.infer<typeof switchTenantDtoSchema>;
