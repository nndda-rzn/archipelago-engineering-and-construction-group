import { useMemo } from 'react';
import type { PermissionCode } from '@aec/shared-types';
import { useMe } from '@/features/auth';

/** Peran yang otomatis dianggap memegang semua izin (jaring pengaman bila daftar permission kosong). */
const SUPER_ROLE = 'SUPER_ADMIN';

export interface Permissions {
  /** Kode permission yang aktif dipegang user (sudah termasuk implikasi SUPER_ADMIN). */
  set: Set<string>;
  /** `true` bila user memegang permission ini (atau SUPER_ADMIN). */
  can: (code: PermissionCode | string) => boolean;
  /** `true` bila user memegang salah satu dari kode ini. */
  canAny: (codes: Array<PermissionCode | string>) => boolean;
}

/**
 * Sumber tunggal keputusan "boleh lihat/tidak" di frontend. Datanya berasal dari
 * `useMe()` (yang diisi saat login dan disimpan di sesi), jadi UI memakai
 * permission yang SAMA dengan yang ditegakkan `PermissionsGuard` backend.
 *
 * `SUPER_ADMIN` sengaja selalu `true`: peran ini memegang semua permission di
 * seed, dan ini menjaga UI tetap utuh bila daftar permission belum termuat.
 */
export function usePermissions(): Permissions {
  const { data } = useMe();
  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];

  return useMemo(() => {
    const isSuper = roles.includes(SUPER_ROLE);
    const set = new Set<string>(permissions);
    const can = (code: PermissionCode | string) => isSuper || set.has(code);
    return {
      set,
      can,
      canAny: (codes) => codes.some((c) => can(c)),
    };
  }, [roles, permissions]);
}
