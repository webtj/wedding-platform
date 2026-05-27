import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

const baseEnv = {
  NODE_ENV: 'production',
  PORT: '4000',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/wedding',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-at-least-32-characters',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL_DAYS: '30',
  STORAGE_PROVIDER: 'local',
  LOCAL_STORAGE_ROOT: '/tmp/wedding-storage',
  API_PUBLIC_BASE_URL: 'https://api.example.com',
  WEB_PUBLIC_BASE_URL: 'https://app.example.com',
  CORS_ORIGINS: 'https://app.example.com,https://admin.example.com',
  WECHAT_MINI_APP_ID: 'wx-dev-appid',
  WECHAT_MINI_APP_SECRET: 'wechat-secret',
  DOUYIN_MINI_APP_ID: 'tt-dev-appid',
  DOUYIN_MINI_APP_SECRET: 'douyin-secret'
};

describe('validateEnv', () => {
  it('accepts complete production env', () => {
    const env = validateEnv(baseEnv);
    expect(env.NODE_ENV).toBe('production');
    expect(env.STORAGE_PROVIDER).toBe('local');
    expect(env.CORS_ORIGINS).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('rejects short jwt secrets in production', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        JWT_ACCESS_SECRET: 'short'
      })
    ).toThrow();
  });

  it('accepts cos provider with credentials', () => {
    const env = validateEnv({
      ...baseEnv,
      STORAGE_PROVIDER: 'cos',
      COS_SECRET_ID: 'cos-id',
      COS_SECRET_KEY: 'cos-key',
      COS_BUCKET: 'my-bucket',
      COS_REGION: 'ap-guangzhou'
    });
    expect(env.STORAGE_PROVIDER).toBe('cos');
  });

  it('rejects cos provider without credentials', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        STORAGE_PROVIDER: 'cos'
      })
    ).toThrow();
  });
});
