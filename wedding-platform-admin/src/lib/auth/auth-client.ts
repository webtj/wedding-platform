import {
  getAccessToken,
  getRefreshToken,
  saveTokens,
  clearTokens,
  clearActiveTenantId
} from './auth-storage';
import type { CurrentUserResponse } from './types';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers);
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  let res = await fetch(path, { ...init, headers });

  if (res.status === 401 && getRefreshToken()) {
    const nextToken = await refreshAccessToken();
    headers.set('authorization', `Bearer ${nextToken}`);
    res = await fetch(path, { ...init, headers });
  }

  if (!res.ok) {
    const msg = res.status === 401 ? '登录已过期，请重新登录' : '请求失败，请稍后重试';
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('缺少刷新令牌');

  const res = await fetch(`/api/identity/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) throw new Error('登录已过期，请重新登录');

  const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
  saveTokens(tokens);
  return tokens.accessToken;
}

export async function login(identifier: string, password: string) {
  const res = await fetch(`/api/identity/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  if (!res.ok) {
    throw new Error('登录失败，请检查账号和密码');
  }

  const data = (await res.json()) as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; displayName: string };
  };

  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

export type SwitchTenantResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; displayName: string };
  activeTenant: { id: string; name: string; address?: string | null } | null;
  permissions: string[];
  isPlatformAdmin: boolean;
  platformLevel: 'super' | 'admin' | null;
};

/**
 * Switch the active tenant context.
 * Returns a fresh access/refresh token pair scoped to the target tenant.
 * The previous refresh token is revoked server-side.
 */
export async function switchTenant(tenantId: string): Promise<SwitchTenantResponse> {
  const refreshToken = getRefreshToken();
  const accessToken = getAccessToken();
  const res = await fetch(`/api/identity/switch-tenant`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ tenantId, refreshToken })
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? '切换租户失败');
  }

  const data = (await res.json()) as SwitchTenantResponse;
  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  invalidateMe();
  return data;
}

let cachedMe: CurrentUserResponse | null = null;
let pendingMe: Promise<CurrentUserResponse> | null = null;
const AUTH_ME_INVALIDATED_EVENT = 'wedding-auth-me-invalidated';
const AUTH_SESSION_ENDED_EVENT = 'wedding-auth-session-ended';

export function getCachedMe(): CurrentUserResponse | null {
  return cachedMe;
}

export function fetchMe(): Promise<CurrentUserResponse> {
  if (cachedMe) return Promise.resolve(cachedMe);
  if (!pendingMe) {
    pendingMe = request<CurrentUserResponse>('/api/identity/me')
      .then((me) => {
        cachedMe = me;
        pendingMe = null;
        return me;
      })
      .catch((err) => {
        pendingMe = null;
        throw err;
      });
  }
  return pendingMe;
}

export function invalidateMe() {
  cachedMe = null;
  pendingMe = null;
}

export function notifyAuthMeInvalidated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_ME_INVALIDATED_EVENT));
}

/**
 * Notify subscribers that the current auth session has fully ended
 * (logout, manual reset). Distinct from `notifyAuthMeInvalidated`, which
 * signals "I changed something — re-fetch me with the same session". A
 * session-ended event triggers a hard reset to the signed-out state and
 * never re-bootstraps (otherwise the cleared tokens would 401).
 */
export function notifyAuthSessionEnded() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_ENDED_EVENT));
}

export { AUTH_ME_INVALIDATED_EVENT, AUTH_SESSION_ENDED_EVENT };

export async function logout() {
  invalidateMe();
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`/api/identity/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    }).catch(() => {});
  }
  clearTokens();
  clearActiveTenantId();
  notifyAuthSessionEnded();
}
