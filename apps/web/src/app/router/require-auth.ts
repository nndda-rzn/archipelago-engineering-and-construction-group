import { redirect } from '@tanstack/react-router';
import { getToken } from '@/shared/lib/http';

export function requireAuth() {
  if (!getToken()) {
    throw redirect({ to: '/login' });
  }
}
