/**
 * Re-export dari `@aec/shared-types`. Daftar permission kini hidup di paket
 * bersama supaya backend (controller `@Permissions`), seed (matrix DB), dan
 * frontend (gating menu/route) memakai kode yang sama persis — tidak ada lagi
 * tiga daftar yang bisa berbeda diam-diam.
 *
 * Impor tetap `@/shared/permissions/permissions` agar 26 controller tidak perlu
 * diubah.
 */
export { Permission, type PermissionCode } from '@aec/shared-types';
