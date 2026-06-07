import {
  getAccessToken,
  setAccessToken,
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

  let res = await fetch(path, { ...init, headers, credentials: 'include' });

  if (res.status === 401) {
    const nextToken = await refreshAccessToken();
    headers.set('authorization', `Bearer ${nextToken}`);
    res = await fetch(path, { ...init, headers, credentials: 'include' });
  }

  if (!res.ok) {
    const msg = res.status === 401 ? '登录已过期，请重新登录' : '请求失败，请稍后重试';
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

export async function refreshAccessToken(): Promise<string> {
  const res = await fetch('/api/identity/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include'
  });

  if (!res.ok) throw new Error('登录已过期，请重新登录');

  const data = (await res.json()) as { accessToken: string };
  setAccessToken(data.accessToken);
  return data.accessToken;
}

export async function login(identifier: string, password: string) {
  const res = await fetch('/api/identity/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
    credentials: 'include'
  });

  if (!res.ok) {
    throw new Error('登录失败，请检查账号和密码');
  }

  const data = (await res.json()) as {
    accessToken: string;
    user: { id: string; displayName: string };
  };

  setAccessToken(data.accessToken);
  return data;
}

export type SwitchTenantResponse = {
  accessToken: string;
  user: { id: string; displayName: string };
  activeTenant: { id: string; name: string; address?: string | null } | null;
  permissions: string[];
  isPlatformAdmin: boolean;
  platformLevel: 'super' | 'admin' | null;
};

export async function switchTenant(tenantId: string): Promise<SwitchTenantResponse> {
  const accessToken = getAccessToken();
  const res = await fetch('/api/identity/switch-tenant', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({ tenantId }),
    credentials: 'include'
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? '切换租户失败');
  }

  const data = (await res.json()) as SwitchTenantResponse;
  setAccessToken(data.accessToken);
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

export function notifyAuthSessionEnded() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_ENDED_EVENT));
}

export { AUTH_ME_INVALIDATED_EVENT, AUTH_SESSION_ENDED_EVENT };

export async function logout() {
  invalidateMe();
  await fetch('/api/identity/logout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include'
  }).catch(() => {});
  clearTokens();
  clearActiveTenantId();
  notifyAuthSessionEnded();
}
