import type { BudgetStatement, BudgetStatementRow, CostTypeKey } from '@aec/api-contracts';

/**
 * Penyusun pernyataan biaya — fungsi murni, tanpa Prisma, supaya rollup dan
 * aturan turunan dapat diuji tanpa database (pola sama dengan `budget-tree.ts`).
 *
 * Aturan yang dipegang:
 * - `baseline`, `revised`, `committed`, `actual`, `byCostType` sebuah simpul
 *   adalah jumlah seluruh subtree-nya.
 * - `available`, `variance`, `varianceBaseline` dihitung **setelah** rollup,
 *   bukan dijumlahkan dari anak. Menjumlahkannya akan salah begitu sebuah induk
 *   juga memiliki nilai sendiri.
 * - Nilai negatif dipertahankan. Over-allocation dan defisit adalah sinyal
 *   nyata, bukan sesuatu yang dijepit ke 0.
 * - Simpul yatim dan siklus dipromosikan menjadi root, bukan dibuang: data yang
 *   hilang dari layar lebih berbahaya daripada data yang muncul tak terduga.
 */

export interface StatementInput {
  wbs: Array<{ id: string; code: string; name: string; parentId: string | null }>;
  baseline: Array<{ wbsItemId: string; costType: CostTypeKey; amount: number }>;
  revised: Array<{ wbsItemId: string; costType: CostTypeKey; amount: number }>;
  committed: Array<{ wbsItemId: string; amount: number }>;
  actual: Array<{ wbsItemId: string; amount: number }>;
  pvByWbs: Map<string, number>;
}

export interface StatementTotals {
  baseline: number;
  revised: number;
  committed: number;
  actual: number;
  available: number;
  variance: number;
  varianceBaseline: number;
}

/** Urutkan kode WBS secara alami: `1` < `1.1` < `2` < `10`. */
function compareCode(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const va = pa[i];
    const vb = pb[i];
    if (va == null && vb == null) return 0;
    if (va == null) return -1;
    if (vb == null) return 1;
    if (!Number.isFinite(va) || !Number.isFinite(vb)) return a.localeCompare(b);
    if (va !== vb) return va - vb;
  }
  return a.localeCompare(b);
}

interface NodeTotals {
  baseline: number;
  revised: number;
  committed: number;
  actual: number;
  byCostType: Record<string, number>;
}

export function buildStatementRows(input: StatementInput): BudgetStatementRow[] {
  const nodeById = new Map(input.wbs.map((n) => [n.id, n]));
  const parentOf = new Map(input.wbs.map((n) => [n.id, n.parentId]));

  const own = new Map<string, NodeTotals>();
  const bucket = (id: string): NodeTotals => {
    const found = own.get(id);
    if (found) return found;
    const fresh: NodeTotals = { baseline: 0, revised: 0, committed: 0, actual: 0, byCostType: {} };
    own.set(id, fresh);
    return fresh;
  };

  for (const r of input.baseline) {
    if (!nodeById.has(r.wbsItemId)) continue;
    bucket(r.wbsItemId).baseline += r.amount;
  }
  for (const r of input.revised) {
    if (!nodeById.has(r.wbsItemId)) continue;
    const b = bucket(r.wbsItemId);
    b.revised += r.amount;
    b.byCostType[r.costType] = (b.byCostType[r.costType] ?? 0) + r.amount;
  }
  for (const r of input.committed) {
    if (!nodeById.has(r.wbsItemId)) continue;
    bucket(r.wbsItemId).committed += r.amount;
  }
  for (const r of input.actual) {
    if (!nodeById.has(r.wbsItemId)) continue;
    bucket(r.wbsItemId).actual += r.amount;
  }

  const isUnderCycle = (id: string): boolean => {
    const seen = new Set<string>();
    let current: string | null = id;
    while (current != null) {
      if (seen.has(current)) return true;
      seen.add(current);
      current = parentOf.get(current) ?? null;
      if (current != null && !nodeById.has(current)) return false;
    }
    return false;
  };

  const childrenOf = new Map<string, string[]>();
  const roots: string[] = [];
  for (const n of input.wbs) {
    const parentId = n.parentId;
    const usableParent =
      parentId != null && nodeById.has(parentId) && parentId !== n.id && !isUnderCycle(n.id);
    if (usableParent) {
      const list = childrenOf.get(parentId) ?? [];
      list.push(n.id);
      childrenOf.set(parentId, list);
    } else {
      roots.push(n.id);
    }
  }

  const out: BudgetStatementRow[] = [];
  const totalsCache = new Map<string, NodeTotals>();

  /**
   * Rollup post-order. Siklus sudah dikeluarkan dari `childrenOf`, jadi rekursi
   * ini berhenti; `totalsCache` mencegah subtree dihitung dua kali.
   */
  const totalsOf = (id: string): NodeTotals => {
    const cached = totalsCache.get(id);
    if (cached) return cached;

    const self = bucket(id);
    const merged: NodeTotals = {
      baseline: self.baseline,
      revised: self.revised,
      committed: self.committed,
      actual: self.actual,
      byCostType: { ...self.byCostType },
    };

    for (const childId of childrenOf.get(id) ?? []) {
      const c = totalsOf(childId);
      merged.baseline += c.baseline;
      merged.revised += c.revised;
      merged.committed += c.committed;
      merged.actual += c.actual;
      for (const [k, v] of Object.entries(c.byCostType)) {
        merged.byCostType[k] = (merged.byCostType[k] ?? 0) + v;
      }
    }

    totalsCache.set(id, merged);
    return merged;
  };

  /** Emit pre-order: induk ditulis sebelum anak, seperti WBS dibaca. */
  const emit = (id: string, depth: number) => {
    const node = nodeById.get(id)!;
    const t = totalsOf(id);
    const childIds = (childrenOf.get(id) ?? []).sort((a, b) =>
      compareCode(nodeById.get(a)!.code, nodeById.get(b)!.code),
    );

    out.push({
      id,
      code: node.code,
      name: node.name,
      parentId: node.parentId,
      depth,
      childrenCount: childIds.length,
      baseline: t.baseline,
      revised: t.revised,
      committed: t.committed,
      actual: t.actual,
      available: t.revised - t.committed - t.actual,
      variance: t.revised - t.actual,
      varianceBaseline: t.revised - t.baseline,
      byCostType: t.byCostType as BudgetStatementRow['byCostType'],
    });

    for (const childId of childIds) emit(childId, depth + 1);
  };

  for (const rootId of roots.sort((a, b) => compareCode(nodeById.get(a)!.code, nodeById.get(b)!.code))) {
    emit(rootId, 0);
  }

  return out;
}

/**
 * Total proyek = jumlah baris root saja. Menjumlahkan seluruh baris akan
 * menghitung anak dua kali, karena setiap induk sudah memuat subtree-nya.
 */
export function sumTotals(rows: BudgetStatementRow[]): StatementTotals {  const roots = rows.filter((r) => r.depth === 0);
  const baseline = roots.reduce((s, r) => s + r.baseline, 0);
  const revised = roots.reduce((s, r) => s + r.revised, 0);
  const committed = roots.reduce((s, r) => s + r.committed, 0);
  const actual = roots.reduce((s, r) => s + r.actual, 0);
  return {
    baseline,
    revised,
    committed,
    actual,
    available: revised - committed - actual,
    variance: revised - actual,
    varianceBaseline: revised - baseline,
  };
}

/**
 * Cakupan PV terhadap BAC.
 *
 * Aturan lama (`|PV/BAC - 1| > 1%` = error) salah secara konsep: PV memang
 * berada di bawah BAC sepanjang proyek berjalan dan baru menyamainya saat
 * selesai. Di data dev, PV tepat 60% BAC pada 9 dari 10 proyek, sehingga aturan
 * lama menyalakan peringatan di hampir semua proyek. Yang benar-benar bermakna
 * adalah PV = 0 (belum ada schedule baseline) dan PV > BAC (tidak wajar).
 */
export function collectStatementWarnings(
  totals: { revised: number; contractValue: number },
  rows: BudgetStatementRow[],
  pv: number,
): BudgetStatement['warnings'] {
  const leaves = rows.filter((r) => r.childrenCount === 0);
  const bac = totals.revised;

  const status: 'NO_BASELINE' | 'PARTIAL' | 'COMPLETE' =
    pv === 0 ? 'NO_BASELINE' : pv > bac ? 'PARTIAL' : 'COMPLETE';

  return {
    overContract: totals.contractValue > 0 && totals.revised > totals.contractValue,
    overCommitted: leaves
      .filter((r) => r.revised > 0 && r.committed > r.revised)
      .map((r) => ({ wbsId: r.id, code: r.code, amount: r.committed - r.revised })),
    noBudget: leaves.filter((r) => r.revised === 0).map((r) => ({ wbsId: r.id, code: r.code })),
    pvCoverage: { pv, bac, status },
  };
}

/**
 * Rekonsiliasi dua sumber biaya material.
 *
 * Material issue hanya menulis `StockLedgerEntry` OUT tanpa jurnal, sedangkan
 * jurnal 610* berasal dari invoice vendor atas material yang sama. Menjumlahkan
 * keduanya menghitung material dua kali. Perbaikan itu menyentuh AC yang menjadi
 * penyebut CPI/SPI di seluruh aplikasi, jadi untuk sekarang kondisinya
 * dilaporkan terbuka alih-alih diperbaiki diam-diam.
 */
export function reconcile(ledgerOut: number, journalExpense610: number): BudgetStatement['reconciliation'] {
  return {
    ledgerOut,
    journalExpense610,
    doubleCountRisk: ledgerOut > 0 && journalExpense610 > 0,
  };
}

/** Berapa simpul yang benar-benar punya biaya teralokasi. */
export function costCoverage(rows: BudgetStatementRow[]): { allocatedNodes: number; totalNodes: number } {
  return {
    allocatedNodes: rows.filter((r) => r.actual > 0).length,
    totalNodes: rows.length,
  };
}
