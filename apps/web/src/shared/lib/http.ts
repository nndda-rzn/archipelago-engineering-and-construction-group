/**
 * HTTP client dasar — FSD shared/lib.
 * Memakai fetch + base `/api` (proxy vite ke api:3000).
 */
const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Logout saat token invalid/expired (401) — hapus token, redirect ke login. */
function handleUnauthorized() {
  const hadToken = !!getToken();
  clearToken();
  if (hadToken && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

const AUTH_HEADERS = (): Record<string, string> => {
  const token = getToken();
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: AUTH_HEADERS() });

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string; correlationId?: string };
    } | null;
    throw new ApiError(
      body?.error?.message ?? `Request failed: ${res.status}`,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.correlationId,
    );
  }

  return res.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...AUTH_HEADERS(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const errBody = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string; correlationId?: string };
    } | null;
    throw new ApiError(
      errBody?.error?.message ?? `Request failed: ${res.status}`,
      errBody?.error?.code ?? 'HTTP_ERROR',
      errBody?.error?.correlationId,
    );
  }

  return res.json() as Promise<T>;
}

/** Simpan token ke localStorage (sederhana — Keycloak menyusul). */
const TOKEN_KEY = 'aec_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
