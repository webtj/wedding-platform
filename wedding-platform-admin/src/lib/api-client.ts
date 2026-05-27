function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api';
  return `${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'}/api`;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('wedding_access_token');
}

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.message === 'string') message = body.message;
      else if (Array.isArray(body?.message)) message = body.message.join('; ');
    } catch {
      /* ignore parse errors */
    }

    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('wedding_access_token');
      localStorage.removeItem('wedding_refresh_token');
      window.location.href = '/auth/sign-in';
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
