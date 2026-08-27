import { redirect } from '@tanstack/react-router';
import { getToken } from '@/shared/lib/http';

/**
 * Auth guard — FSD app/router.
 * Cek token sebelum render rute app. Belum login → /login.
 * Keycloak menyusul (PRD §26).
 */
export function requireAuth() {
  if (!getToken()) {
    throw redirect({ to: '/login' });
  }
}
