import { z } from 'zod';

export const createTenantDtoSchema = z.object({
  name: z.string().min(2).max(80),
});

export type CreateTenantDto = z.infer<typeof createTenantDtoSchema>;
