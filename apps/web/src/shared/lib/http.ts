

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

function handleUnauthorized() {
  const hadToken = !!getToken();
  clearToken();
  clearSession();
  if (hadToken && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

const AUTH_HEADERS = (): Record<string, string> => {
  const token = getToken();
  return { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const NUMERIC_STRING_EXCLUDE = /(Code|Number|Id|Phone|Hash|Revision)$|tax|accountNumber|serialNumber|^unit$|^currency$/i;

export function jsonReviver(key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    value.trim() !== '' &&
    !Number.isNaN(Number(value)) &&
    !NUMERIC_STRING_EXCLUDE.test(key)
  ) {
    return Number(value);
  }
  return value;
}

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

  return res.text().then((text) => JSON.parse(text, jsonReviver)) as Promise<T>;
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

  return res.text().then((text) => JSON.parse(text, jsonReviver)) as Promise<T>;
}

/**
 * Unduh berkas biner (mis. CSV export server-side) dengan header Authorization.
 * Menyimpan respons sebagai Blob dan memicu download; nama file diambil dari
 * Content-Disposition bila ada.
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { headers: AUTH_HEADERS() });

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      body?.error?.message ?? `Download failed: ${res.status}`,
      body?.error?.code ?? 'HTTP_ERROR',
    );
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const TOKEN_KEY = 'aec_token';
const SESSION_KEY = 'aec_session';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export type StoredUser = { id: string; email: string; displayName: string; roles: string[] };

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
