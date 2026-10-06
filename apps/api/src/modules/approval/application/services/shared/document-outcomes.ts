/**
 * Ringkasan hasil **per dokumen**, bukan per baris task.
 *
 * Kenapa ini ada: satu dokumen menghasilkan BEBERAPA baris `ApprovalTask` (satu
 * per langkah). Menjumlahkan kolom `approved` lintas langkah karena itu menghitung
 * dokumen yang sama dua kali — dokumen yang disetujui di langkah 2 juga sudah
 * tercatat APPROVED di langkah 1. Rumus lama
 * (`lastStep.approved / firstStep.total`) juga salah dengan cara lain: ia
 * membuang dokumen yang memang selesai di langkah awal karena syaratnya tidak
 * terpenuhi.
 *
 * Bentuk yang benar: kelompokkan per dokumen, tentukan satu hasil final per
 * dokumen, baru hitung.
 */

export interface TaskOutcomeRow {
  transactionId: string;
  stepOrder: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
}

export interface DocumentOutcomes {
  /** Jumlah dokumen yang masuk rantai. */
  entered: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
  /** Persen dokumen yang benar-benar selesai (0–100, dibulatkan). */
  approvalRate: number;
}

/**
 * Hasil final sebuah dokumen, dari seluruh langkahnya.
 *
 * Urutan prioritas penting dan mengikuti aturan domain:
 * - **REJECTED menang**: satu penolakan menghentikan dokumen, sisa langkahnya
 *   dibatalkan server (`decide()`), jadi dokumen itu ditolak — bukan "cancelled".
 * - **PENDING berikutnya**: masih berjalan, belum selesai.
 * - **CANCELLED**: dokumen berhenti tanpa keputusan penolakan.
 * - sisanya (semua APPROVED) baru dihitung **approved**.
 */
function outcomeOf(statuses: string[]): 'approved' | 'rejected' | 'pending' | 'cancelled' {
  if (statuses.includes('REJECTED')) return 'rejected';
  if (statuses.includes('PENDING')) return 'pending';
  if (statuses.includes('CANCELLED')) return 'cancelled';
  return 'approved';
}

export function summariseDocumentOutcomes(rows: TaskOutcomeRow[]): DocumentOutcomes {
  const byDocument = new Map<string, string[]>();
  for (const row of rows) {
    const list = byDocument.get(row.transactionId) ?? [];
    list.push(row.status);
    byDocument.set(row.transactionId, list);
  }

  let approved = 0;
  let rejected = 0;
  let pending = 0;
  let cancelled = 0;
  for (const statuses of byDocument.values()) {
    switch (outcomeOf(statuses)) {
      case 'approved': approved += 1; break;
      case 'rejected': rejected += 1; break;
      case 'pending': pending += 1; break;
      case 'cancelled': cancelled += 1; break;
    }
  }

  const entered = byDocument.size;
  return {
    entered,
    approved,
    rejected,
    pending,
    cancelled,
    approvalRate: entered > 0 ? Math.round((approved / entered) * 100) : 0,
  };
}
