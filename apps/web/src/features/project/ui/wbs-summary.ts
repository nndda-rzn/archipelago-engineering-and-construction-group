import type { WbsItem } from '@aec/api-contracts';

export interface WbsSummaryBranch {
  id: string;
  code: string;
  name: string;
  budget: number;
  actual: number;
  progress: number | null;
  /** Porsi budget cabang terhadap total (0–100). 0 bila total budget 0. */
  sharePct: number;
}

export interface WbsSummary {
  totalBudget: number;
  totalActual: number;
  /** Progress gabungan, dibobot budget cabang; `null` bila tak ada yang melaporkan. */
  totalProgress: number | null;
  rootCount: number;
  branches: WbsSummaryBranch[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Ringkasan WBS dari rollup tiap **root** (cabang). Total = Σ cabang; progress
 * gabungan = rata-rata **berbobot budget** antar cabang (jatuh ke rata-rata
 * sederhana bila tak ada budget). Jujur soal ketiadaan data: progress `null`,
 * bukan `0` — nol berarti "belum ada progres", bukan "tidak diketahui".
 */
export function computeWbsSummary(tree: WbsItem[]): WbsSummary {
  let totalBudget = 0;
  let totalActual = 0;
  let weightedSum = 0;
  let weightTotal = 0;
  let simpleSum = 0;
  let simpleCount = 0;

  for (const root of tree) {
    totalBudget += root.rollup.budget;
    totalActual += root.rollup.actual;
    if (root.rollup.progress != null) {
      weightedSum += root.rollup.progress * root.rollup.budget;
      weightTotal += root.rollup.budget;
      simpleSum += root.rollup.progress;
      simpleCount += 1;
    }
  }

  const totalProgress =
    weightTotal > 0 ? round2(weightedSum / weightTotal) : simpleCount > 0 ? round2(simpleSum / simpleCount) : null;

  const branches: WbsSummaryBranch[] = tree.map((root) => ({
    id: root.id,
    code: root.code,
    name: root.name,
    budget: root.rollup.budget,
    actual: root.rollup.actual,
    progress: root.rollup.progress,
    sharePct: totalBudget > 0 ? round2((root.rollup.budget / totalBudget) * 100) : 0,
  }));

  return { totalBudget, totalActual, totalProgress, rootCount: tree.length, branches };
}
