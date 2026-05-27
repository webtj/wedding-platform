import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './auth-storage';
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
    user: { id: string; displayName: string; isPlatformAdmin: boolean };
  };

  saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data;
}

let cachedMe: CurrentUserResponse | null = null;
let pendingMe: Promise<CurrentUserResponse> | null = null;

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
}
