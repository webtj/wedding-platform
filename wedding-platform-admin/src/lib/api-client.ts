import { getAccessToken, setAccessToken, clearTokens } from '@/lib/auth/auth-storage';
import { getErrorMessage, shouldToastError, type ApiErrorResponse } from '@/lib/error-codes';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api';
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'}/api`;
}

function getToken(): string | null {
  return getAccessToken();
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/identity/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include'
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string };
    setAccessToken(data.accessToken);
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
    headers,
    credentials: 'include'
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    token = await tryRefreshToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      res = await fetch(`${getBaseUrl()}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
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

    if (res.status === 403 && typeof window !== 'undefined') {
      const details = body.details as
        | { requiredPermissions?: string[]; resource?: string }
        | undefined;
      window.dispatchEvent(
        new CustomEvent('app:forbidden', {
          detail: {
            requiredPermissions: details?.requiredPermissions,
            resource: details?.resource,
            source: 'mutation' as const,
            message
          }
        })
      );
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
