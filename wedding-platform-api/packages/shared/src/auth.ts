import { z } from 'zod';

export const AUTH_PROVIDERS = {
  PASSWORD: 'password',
  PHONE: 'phone',
  WECHAT_MINI: 'wechat_mini',
  DOUYIN_MINI: 'douyin_mini'
} as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];

export const loginRequestSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export type AuthTenant = {
  id: string;
  name: string;
};

export type AuthUser = {
  id: string;
  displayName: string;
  isPlatformAdmin: boolean;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  activeTenant: AuthTenant | null;
  permissions: string[];
};
