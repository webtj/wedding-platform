import { z } from 'zod';

export const updateSettingSchema = z.object({
  value: z.unknown(),
  label: z.string().trim().max(120).optional(),
  encrypted: z.boolean().optional(),
  defaultValue: z.unknown().optional()
});

export const batchUpdateSettingsSchema = z.record(
  z.string(),
  z.object({
    value: z.unknown(),
    label: z.string().trim().max(120).optional(),
    encrypted: z.boolean().optional()
  })
);

export const testConnectionSchema = z.object({
  provider: z.string().trim().min(1),
  baseUrl: z.string().trim().url(),
  apiKey: z.string().trim().optional().default(''),
  model: z.string().trim().min(1)
});
