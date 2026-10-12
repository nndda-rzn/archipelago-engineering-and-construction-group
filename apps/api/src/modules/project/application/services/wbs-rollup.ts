/**
 * Rollup WBS — murni, tanpa Prisma.
 *
 * Setiap node mengumpulkan nilai dari anaknya:
 * - `budget` / `actual` = milik sendiri + Σ rollup anak.
 * - `childCount` = jumlah anak langsung.
 * - `progress` = nilai sendiri bila leaf; bila punya anak, rata-rata **berbobot
 *   budget** dari progress anak (jatuh ke rata-rata sederhana bila tak ada anak
 *   yang punya budget). `null` bila tak ada yang diketahui — bukan `0`.
 */
export interface WbsRollupNode {
  id: string;
  parentId: string | null;
}

export interface WbsRollup {
  budget: number;
  actual: number;
  progress: number | null;
  childCount: number;
}

export function computeWbsRollup(
  nodes: WbsRollupNode[],
  ownBudget: Map<string, number>,
  ownActual: Map<string, number>,
  ownProgress: Map<string, number>,
): Map<string, WbsRollup> {
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (n.parentId) {
      const list = childrenOf.get(n.parentId) ?? [];
      list.push(n.id);
      childrenOf.set(n.parentId, list);
    }
  }

  const result = new Map<string, WbsRollup>();
  const visiting = new Set<string>();

  const visit = (id: string): WbsRollup => {
    const cached = result.get(id);
    if (cached) return cached;
    // Guard defensif: siklus data (seharusnya dicegah di service) tak boleh
    // membuat rekursi tak terbatas.
    if (visiting.has(id)) return { budget: 0, actual: 0, progress: null, childCount: 0 };
    visiting.add(id);

    const childIds = childrenOf.get(id) ?? [];
    const own = ownBudget.get(id) ?? 0;
    const ownAct = ownActual.get(id) ?? 0;

    if (childIds.length === 0) {
      const rollup: WbsRollup = {
        budget: own,
        actual: ownAct,
        progress: ownProgress.has(id) ? ownProgress.get(id)! : null,
        childCount: 0,
      };
      result.set(id, rollup);
      visiting.delete(id);
      return rollup;
    }

    let budget = own;
    let actual = ownAct;
    let weightedSum = 0;
    let weightTotal = 0;
    let simpleSum = 0;
    let simpleCount = 0;

    for (const childId of childIds) {
      const c = visit(childId);
      budget += c.budget;
      actual += c.actual;
      if (c.progress != null) {
        weightedSum += c.progress * c.budget;
        weightTotal += c.budget;
        simpleSum += c.progress;
        simpleCount += 1;
      }
    }

    const progress = weightTotal > 0 ? weightedSum / weightTotal : simpleCount > 0 ? simpleSum / simpleCount : null;

    const rollup: WbsRollup = {
      budget,
      actual,
      progress: progress == null ? null : Math.round(progress * 100) / 100,
      childCount: childIds.length,
    };
    result.set(id, rollup);
    visiting.delete(id);
    return rollup;
  };

  for (const n of nodes) visit(n.id);
  return result;
}
