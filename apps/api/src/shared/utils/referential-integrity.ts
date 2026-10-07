/**
 * Deteksi referensi menggantung (dangling) pada data approval.
 *
 * Latar: `ApprovalTask.transactionId` menyimpan primary key dokumen sumber
 * (`PurchaseRequisition.id` / `PurchaseOrder.id`). Bila id itu bukan id asli —
 * mis. seed yang mengarang string "PurchaseRequisition-PR-..." — maka task tetap
 * tampil di inbox, tetapi menekan Approve akan gagal `P2025` (404) karena
 * `update({ where: { id } })` tidak menemukan baris.
 *
 * Fungsi ini memisahkan keputusan "task ini yatim atau tidak" dari DB, sehingga
 * dapat diuji tanpa koneksi dan dipakai baik oleh seed (membersihkan) maupun
 * oleh pemeriksaan kesehatan data.
 */
export interface ApprovalTaskRef {
  id: string;
  transactionType: string;
  transactionId: string;
  transactionCode?: string | null;
}

/** Tipe transaksi yang punya tabel sumber di aplikasi ini. */
export const SUPPORTED_TRANSACTION_TYPES = ['PurchaseRequisition', 'PurchaseOrder'] as const;

/**
 * Kembalikan task yang `transactionId`-nya TIDAK ada di himpunan id yang valid.
 *
 * @param tasks        task yang diperiksa
 * @param existsForType fungsi (type, id) → apakah dokumen sumber ada
 * @param opts.onlySupportedType bila true, task dengan tipe di luar
 *        `SUPPORTED_TRANSACTION_TYPES` dilewati (tidak dianggap yatim), karena
 *        kita tidak punya cara memverifikasinya.
 */
export function findOrphanApprovalTasks(
  tasks: ApprovalTaskRef[],
  existsForType: (transactionType: string, transactionId: string) => boolean,
  opts: { onlySupportedType?: boolean } = {},
): ApprovalTaskRef[] {
  const supported = new Set<string>(SUPPORTED_TRANSACTION_TYPES);
  return tasks.filter((t) => {
    if (opts.onlySupportedType && !supported.has(t.transactionType)) return false;
    return !existsForType(t.transactionType, t.transactionId);
  });
}
