import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  API_PUBLIC_BASE_URL: z.string().url(),
  WEB_PUBLIC_BASE_URL: z.string().url(),
  CORS_ORIGINS: z
    .string()
    .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean)),
  STORAGE_PROVIDER: z.enum(['local', 'cos', 'oss']).default('local'),
  LOCAL_STORAGE_ROOT: z.string().min(1).default('/tmp/wedding-storage'),
  COS_SECRET_ID: z.string().optional(),
  COS_SECRET_KEY: z.string().optional(),
  COS_BUCKET: z.string().optional(),
  COS_REGION: z.string().optional(),
  OSS_ACCESS_KEY_ID: z.string().optional(),
  OSS_ACCESS_KEY_SECRET: z.string().optional(),
  OSS_BUCKET: z.string().optional(),
  OSS_REGION: z.string().optional(),
  WECHAT_MINI_APP_ID: z.string().optional(),
  WECHAT_MINI_APP_SECRET: z.string().optional(),
  DOUYIN_MINI_APP_ID: z.string().optional(),
  DOUYIN_MINI_APP_SECRET: z.string().optional(),
  SETTINGS_ENCRYPTION_SECRET: z.string().min(16)
});

export type ApiEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): ApiEnv {
  const env = envSchema.parse(config);

  if (env.STORAGE_PROVIDER === 'cos') {
    z.object({
      COS_SECRET_ID: z.string().min(1),
      COS_SECRET_KEY: z.string().min(1),
      COS_BUCKET: z.string().min(1),
      COS_REGION: z.string().min(1)
    }).parse(env);
  }

  if (env.STORAGE_PROVIDER === 'oss') {
    z.object({
      OSS_ACCESS_KEY_ID: z.string().min(1),
      OSS_ACCESS_KEY_SECRET: z.string().min(1),
      OSS_BUCKET: z.string().min(1),
      OSS_REGION: z.string().min(1)
    }).parse(env);
  }

  return env;
}
