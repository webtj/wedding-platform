const ACTIVE_TENANT_KEY = 'wedding_active_tenant';

let accessTokenInMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null) {
  accessTokenInMemory = token;
}

export function saveTokens(input: { accessToken: string; refreshToken?: string }) {
  accessTokenInMemory = input.accessToken;
}

export function clearTokens() {
  accessTokenInMemory = null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function getActiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_TENANT_KEY);
}

export function setActiveTenantId(tenantId: string | null) {
  if (typeof window === 'undefined') return;
  if (tenantId) {
    window.localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
  } else {
    window.localStorage.removeItem(ACTIVE_TENANT_KEY);
  }
}

export function clearActiveTenantId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_TENANT_KEY);
}
