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

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
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
