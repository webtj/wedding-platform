import { getRefreshToken, clearTokens } from '@/lib/auth/auth-storage';
import { getErrorMessage, shouldToastError, type ApiErrorResponse } from '@/lib/error-codes';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api';
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'}/api`;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('wedding_access_token');
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch('/api/identity/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    window.localStorage.setItem('wedding_access_token', data.accessToken);
    window.localStorage.setItem('wedding_refresh_token', data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function parseErrorBody(res: Response): Promise<Partial<ApiErrorResponse>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function apiClient<T>(endpoint: string, options?: RequestInit & { silent?: boolean }): Promise<T> {
  const silent = options?.silent ?? false;
  const headers = new Headers(options?.headers);
  // Allow callers to opt out of the default JSON content-type (e.g. for FormData uploads)
  // by explicitly passing a Content-Type header set to a falsy value.
  const rawHeaders = options?.headers as Record<string, string> | undefined;
  const skipDefaultContentType = rawHeaders && 'Content-Type' in rawHeaders && !rawHeaders['Content-Type'];
  if (skipDefaultContentType) {
    headers.delete('Content-Type');
  } else if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    token = await tryRefreshToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      res = await fetch(`${getBaseUrl()}${endpoint}`, {
        ...options,
        headers
      });
    }
  }

  if (!res.ok) {
    const body = await parseErrorBody(res);
    const code = body.code ?? 'INTERNAL_ERROR';
    const message = getErrorMessage(code, body.message);

    if (res.status === 401 && typeof window !== 'undefined') {
      clearTokens();
      window.location.href = '/auth/sign-in';
    }

    if (!silent && shouldToastError(code) && typeof window !== 'undefined') {
      const { toast } = await import('sonner');
      toast.error(message, {
        description: body.message && body.message !== message ? body.message.slice(0, 120) : undefined,
        duration: 5000
      });
    }

    throw new ApiError(code, message, res.status, body.details);
  }

  return res.json() as Promise<T>;
}
