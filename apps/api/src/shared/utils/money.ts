/**
 * Bantuan perbandingan uang.
 *
 * Nominal disimpan sebagai `Decimal(18, 2)`. Membandingkan dengan `Number` + toleransi
 * (mis. `+ 0.001`) menutupi galat floating point dengan ambang yang berubah-ubah menurut
 * besarnya nilai, dan bisa meloloskan atau menolak nominal yang seharusnya tidak.
 * Mengubah ke satuan **sen (integer)** membuat perbandingan eksak untuk nilai
 * dalam rentang yang wajar untuk ERP ini.
 *
 * Batas: `Number` aman sampai 2^53, sehingga sen tetap eksak selama nominal < ~9e13.
 * Bila kelak ada nilai kontrak di atas itu, perbandingan harus memakai `Prisma.Decimal`
 * atau `BigInt` — bukan helper ini.
 */

type MoneyLike = number | string | { toString(): string } | null | undefined;

/** Ubah nominal ke sen (integer, dibulatkan ke sen terdekat). */
export function toCents(value: MoneyLike): number {
  if (value === null || value === undefined) return 0;
  return Math.round(Number(value) * 100);
}

/** Ubah kembali dari sen ke nominal satuan utama. */
export function fromCents(cents: number): number {
  return cents / 100;
}
