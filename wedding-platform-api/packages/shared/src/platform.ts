import { z } from 'zod';

export const upsertPlatformSettingSchema = z.object({
  group: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  value: z.record(z.string(), z.unknown())
});

export type UpsertPlatformSettingInput = z.infer<typeof upsertPlatformSettingSchema>;
