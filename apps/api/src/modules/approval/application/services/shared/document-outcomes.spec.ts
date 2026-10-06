import { summariseDocumentOutcomes, type TaskOutcomeRow } from './document-outcomes';

/**
 * Baris task nyata dari seed demo PR_APPROVAL (dipakai sebagai data uji supaya
 * angkanya bukan karangan):
 *
 *   step 1: total 11, approved 7, rejected 1, pending 3
 *   step 2: total  6, approved 4, rejected 0, pending 2
 *
 * Dokumen yang sampai langkah 2 adalah 6 dari 11 (5 dokumen berhenti di langkah 1
 * karena syaratnya tidak terpenuhi). Dari 7 approval di langkah 1, 6 lanjut ke
 * langkah 2 — jadi **tidak boleh** dijumlahkan lintas langkah (double count).
 */
function task(transactionId: string, stepOrder: number, status: TaskOutcomeRow['status']): TaskOutcomeRow {
  return { transactionId, stepOrder, status };
}

/** Bangun 11 dokumen yang meniru pola seed: 1 selesai di step 1, 4 approve di step 2, 1 ditolak, 5 menunggu. */
function seedLikeRows(): TaskOutcomeRow[] {
  const rows: TaskOutcomeRow[] = [];
  // D1: selesai di langkah 1 (tidak lanjut — syarat tidak terpenuhi).
  rows.push(task('D1', 1, 'APPROVED'));
  // D2..D5: approve di langkah 2 (langkah 1 juga APPROVED).
  for (const id of ['D2', 'D3', 'D4', 'D5']) {
    rows.push(task(id, 1, 'APPROVED'));
    rows.push(task(id, 2, 'APPROVED'));
  }
  // D6: ditolak di langkah 1.
  rows.push(task('D6', 1, 'REJECTED'));
  // D7..D9: masih menunggu di langkah 1.
  for (const id of ['D7', 'D8', 'D9']) rows.push(task(id, 1, 'PENDING'));
  // D10..D11: sudah lewat langkah 1, menunggu di langkah 2.
  for (const id of ['D10', 'D11']) {
    rows.push(task(id, 1, 'APPROVED'));
    rows.push(task(id, 2, 'PENDING'));
  }
  return rows;
}

describe('summariseDocumentOutcomes', () => {
  it('counts a document approved at step 2 only once, not once per step', () => {
    const result = summariseDocumentOutcomes(seedLikeRows());
    // 11 dokumen masuk; 5 selesai (1 di langkah 1 + 4 di langkah 2).
    expect(result.entered).toBe(11);
    expect(result.approved).toBe(5);
  });

  it('reports the approval rate over documents, not over task rows', () => {
    const result = summariseDocumentOutcomes(seedLikeRows());
    // 5 dari 11 = 45%. Rumus lama (last step approved / first step total) memberi 4/11 = 36%.
    expect(result.approvalRate).toBe(45);
  });

  it('separates rejected and pending documents', () => {
    const result = summariseDocumentOutcomes(seedLikeRows());
    expect(result.rejected).toBe(1);
    expect(result.pending).toBe(5);
  });

  it('accounts for every document exactly once', () => {
    const result = summariseDocumentOutcomes(seedLikeRows());
    expect(result.approved + result.rejected + result.pending + result.cancelled).toBe(result.entered);
  });

  it('treats a document with a rejected step as rejected even if an earlier step approved', () => {
    const rows = [task('X', 1, 'APPROVED'), task('X', 2, 'REJECTED')];
    const result = summariseDocumentOutcomes(rows);
    expect(result.rejected).toBe(1);
    expect(result.approved).toBe(0);
  });

  it('treats a document with a pending step as pending even if an earlier step approved', () => {
    const rows = [task('X', 1, 'APPROVED'), task('X', 2, 'PENDING')];
    const result = summariseDocumentOutcomes(rows);
    expect(result.pending).toBe(1);
    expect(result.approved).toBe(0);
  });

  it('counts a document whose steps are all cancelled as cancelled, not approved', () => {
    const rows = [task('X', 1, 'CANCELLED')];
    const result = summariseDocumentOutcomes(rows);
    expect(result.cancelled).toBe(1);
    expect(result.approved).toBe(0);
  });

  it('returns zeroes and a zero rate for no tasks', () => {
    expect(summariseDocumentOutcomes([])).toEqual({
      entered: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      cancelled: 0,
      approvalRate: 0,
    });
  });
});
