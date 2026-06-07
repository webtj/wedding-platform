const ACCESS_TOKEN_KEY = 'wedding_access_token';
const REFRESH_TOKEN_KEY = 'wedding_refresh_token';
const ACTIVE_TENANT_KEY = 'wedding_active_tenant';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function saveTokens(input: { accessToken: string; refreshToken: string }) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, input.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, input.refreshToken);
}

export function getAccessToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getActiveTenantId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACTIVE_TENANT_KEY);
}

export function setActiveTenantId(tenantId: string | null) {
  if (!isBrowser()) return;
  if (tenantId) {
    window.localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
  } else {
    window.localStorage.removeItem(ACTIVE_TENANT_KEY);
  }
}

export function clearActiveTenantId() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACTIVE_TENANT_KEY);
}
