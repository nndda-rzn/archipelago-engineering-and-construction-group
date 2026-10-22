import type { BudgetSummary, CostTypeKey } from '@aec/api-contracts';

/**
 * Penyusun pohon budget — fungsi murni, tanpa Prisma, supaya rollup dan peringatan
 * dapat diuji tanpa database.
 *
 * Aturan yang dipegang di sini:
 * - `budget`, `used`, `byCostType`, `remaining` pada sebuah simpul adalah jumlah
 *   seluruh subtree-nya (nilai milik simpul itu + semua keturunan).
 * - `remaining` boleh negatif. Over-allocation adalah sinyal nyata, bukan sesuatu
 *   yang dijepit ke 0.
 * - Simpul yang `parentId`-nya tidak dapat diresolusi (data yatim) atau membentuk
 *   siklus diperlakukan sebagai root, bukan dibuang — data yang hilang dari layar
 *   lebih berbahaya daripada data yang muncul di tempat tak terduga.
 */

export interface BudgetNodeInput {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
}

export interface BudgetRowInput {
  wbsItemId: string;
  costType: CostTypeKey;
  amount: number;
}

export interface SpendInput {
  wbsItemId: string;
  amount: number;
}

export interface BudgetTreeNode extends Omit<BudgetSummary['wbs'][number], 'childrenCount'> {
  childrenCount: number;
  children: BudgetTreeNode[];
}

/** Urutkan kode WBS secara alami: `1` < `1.1` < `2` < `10`. */
function compareCode(a: string, b: string): number {
  const pa = a.split('.').map((s) => Number(s));
  const pb = b.split('.').map((s) => Number(s));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const va = pa[i];
    const vb = pb[i];
    if (va == null && vb == null) return 0;
    if (va == null) return -1;
    if (vb == null) return 1;
    if (!Number.isFinite(va) || !Number.isFinite(vb)) {
      return a.localeCompare(b);
    }
    if (va !== vb) return va - vb;
  }
  return a.localeCompare(b);
}

/**
 * Resolusi kedalaman lewat rantai `parentId`. Siklus dan induk yang hilang
 * menghasilkan `depth = 0` (diperlakukan sebagai root) agar tidak ada loop tak
 * berujung dan tidak ada simpul yang hilang.
 */
function resolveDepth(id: string, parentOf: Map<string, string | null>): number {
  let depth = 0;
  let current = parentOf.get(id) ?? null;
  const seen = new Set<string>([id]);
  while (current != null) {
    if (seen.has(current)) return 0;
    seen.add(current);
    if (!parentOf.has(current)) return 0;
    depth += 1;
    current = parentOf.get(current) ?? null;
  }
  return depth;
}

export function buildBudgetTree(
  nodes: BudgetNodeInput[],
  rows: BudgetRowInput[],
  spend: SpendInput[],
  pvByWbs: Map<string, number>,
): BudgetTreeNode[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));

  const ownBudget = new Map<string, Record<string, number>>();
  const ownUsed = new Map<string, number>();

  for (const r of rows) {
    if (!nodeById.has(r.wbsItemId)) continue;
    const bucket = ownBudget.get(r.wbsItemId) ?? {};
    bucket[r.costType] = (bucket[r.costType] ?? 0) + r.amount;
    ownBudget.set(r.wbsItemId, bucket);
  }
  for (const s of spend) {
    if (!nodeById.has(s.wbsItemId)) continue;
    ownUsed.set(s.wbsItemId, (ownUsed.get(s.wbsItemId) ?? 0) + s.amount);
  }

  // Anak-anak, hanya untuk induk yang benar-benar ada (mencegah anak yatim
  // menghilang: induk yang tidak dikenal tidak dipakai sebagai wadah).
  //
  // Siklus (a→b→a) tidak boleh membuat simpul hilang dari layar: rantai `parentId`
  // ditelusuri dulu, dan setiap simpul yang tidak berujung pada root dipromosikan
  // menjadi root. Tanpa ini, dua simpul yang saling menunjuk tidak pernah masuk
  // `roots` maupun `childrenOf`, sehingga pohonnya kosong.
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
  for (const n of nodes) {
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

  const build = (id: string): BudgetTreeNode => {
    const input = nodeById.get(id)!;
    const childIds = (childrenOf.get(id) ?? []).sort((a, b) => compareCode(nodeById.get(a)!.code, nodeById.get(b)!.code));
    const children = childIds.map(build);

    const byCostType: Record<string, number> = {};
    for (const [k, v] of Object.entries(ownBudget.get(id) ?? {})) byCostType[k] = v;
    let used = ownUsed.get(id) ?? 0;
    for (const c of children) {
      used += c.used;
      for (const [k, v] of Object.entries(c.byCostType)) byCostType[k] = (byCostType[k] ?? 0) + v;
    }

    const budget = Object.values(byCostType).reduce((s, v) => s + v, 0);

    return {
      id,
      code: input.code,
      name: input.name,
      parentId: input.parentId,
      depth: resolveDepth(id, parentOf),
      budget,
      used,
      remaining: budget - used,
      byCostType: byCostType as BudgetTreeNode['byCostType'],
      plannedValue: pvByWbs.get(id) ?? 0,
      itemCount: Object.keys(ownBudget.get(id) ?? {}).length,
      childrenCount: children.length,
      children,
    };
  };

  return roots
    .map((id) => nodeById.get(id)!)
    .sort((a, b) => compareCode(a.code, b.code))
    .map((n) => build(n.id));
}

/** Ratakan pohon (pre-order) supaya konsumen datar seperti kontrak `wbs[]`. */
export function flattenTree(tree: BudgetTreeNode[]): BudgetTreeNode[] {
  const out: BudgetTreeNode[] = [];
  const walk = (n: BudgetTreeNode) => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const n of tree) walk(n);
  return out;
}

/**
 * Peringatan kewajaran. Ambang PV: selisih lebih dari 1% dianggap tidak seimbang —
 * di bawah itu hanya pembulatan, bukan masalah data.
 */
export function collectWarnings(
  totals: { budget: number; used: number; contractValue: number },
  tree: BudgetTreeNode[],
  pv: number,
): BudgetSummary['warnings'] {
  const nodes = flattenTree(tree);
  const bac = totals.budget;

  const noBudget = nodes
    .filter((n) => n.childrenCount === 0 && n.budget === 0)
    .map((n) => ({ wbsId: n.id, code: n.code }));

  const overAllocated = nodes
    .filter((n) => n.budget > 0 && n.used > n.budget)
    .map((n) => ({ wbsId: n.id, code: n.code, amount: n.used - n.budget }));

  const ratio = bac > 0 ? pv / bac : 1;
  const pvMismatch = bac > 0 && Math.abs(ratio - 1) > 0.01 ? { pv, bac, ratio } : null;

  return {
    overContract: totals.contractValue > 0 && totals.budget > totals.contractValue,
    overAllocated,
    noBudget,
    pvMismatch,
  };
}
