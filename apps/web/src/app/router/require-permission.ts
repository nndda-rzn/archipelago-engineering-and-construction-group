import { redirect } from '@tanstack/react-router';
import type { NavPermission } from '@aec/shared-types';
import { SUPERADMIN_ONLY } from '@aec/shared-types';
import { getStoredUser } from '@/shared/lib/http';

/** Peran yang otomatis dianggap memegang semua izin. */
const SUPER_ROLE = 'SUPER_ADMIN';

/**
 * Boleh/tidak dihitung dari sesi tersimpan (dibaca sinkron di `beforeLoad`).
 * Sumbernya sama dengan `usePermissions`, tetapi tanpa hook karena router
 * mengevaluasi guard sebelum komponen dirender.
 */
export function canAccess(code: NavPermission | string): boolean {
  const user = getStoredUser();
  if (!user) return false;
  if (user.roles.includes(SUPER_ROLE)) return true;
  if (code === SUPERADMIN_ONLY) return false;
  return (user.permissions ?? []).includes(code);
}

/**
 * Penjaga route: bila user tidak memegang permission, alihkan ke halaman
 * "Access denied" sambil membawa asal halaman. Menyembunyikan menu saja tidak
 * cukup — pengguna bisa mengetik URL langsung, dan itu tetap harus dicegat.
 */
export function requirePermission(code: NavPermission | string) {
  return ({ location }: { location: { pathname: string } }) => {
    if (!canAccess(code)) {
      throw redirect({ to: '/forbidden', search: { from: location.pathname } });
    }
  };
}
