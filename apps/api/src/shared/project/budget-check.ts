import type { Prisma } from '@prisma/client';

export interface BudgetCheckResult {
  budget: number;
  commitment: number;
  existingPr: number;
  remaining: number;
  within: boolean;
}

/** Klien minimal yang dibutuhkan — `PrismaService` atau `tx` sama-sama cocok. */
export type BudgetCheckClient = Pick<
  Prisma.TransactionClient,
  'budgetItem' | 'purchaseOrder' | 'subcontract' | 'purchaseRequisition'
>;

/**
 * Sisa budget sebuah proyek (FR-PRO-002).
 *
 * `remaining = budget − commitment − existingPr`, dengan `commitment` = PO RELEASED
 * + Subcontract ACTIVE. PR yang sudah punya PO RELEASED TIDAK dihitung lagi di
 * `existingPr`: nilainya sudah masuk lewat PO — tanpa pengecualian ini PR-terkonversi
 * + PO-nya terhitung dua kali sehingga `remaining` terlalu kecil (false
 * BUDGET_EXCEEDED).
 *
 * Diekstrak ke sini agar modul procurement (validasi saat membuat PR) dan modul
 * approval (menampilkan konteks budget sebelum memutuskan) memakai **rumus yang
 * sama persis** — bukan dua perhitungan yang bisa berbeda.
 */
export async function computeBudgetCheck(
  client: BudgetCheckClient,
  projectId: string,
  estimatedTotal: number,
): Promise<BudgetCheckResult> {
  const [budgetAgg, poAgg, subconAgg, prAgg] = await Promise.all([
    client.budgetItem.aggregate({ where: { projectId, status: 'PUBLISHED' }, _sum: { amount: true } }),
    client.purchaseOrder.aggregate({ where: { projectId, status: 'RELEASED' }, _sum: { totalAmount: true } }),
    client.subcontract.aggregate({ where: { projectId, status: 'ACTIVE' }, _sum: { contractValue: true } }),
    client.purchaseRequisition.aggregate({
      where: {
        projectId,
        status: { not: 'CANCELLED' },
        purchaseOrders: { none: { status: 'RELEASED' } },
      },
      _sum: { estimatedTotal: true },
    }),
  ]);

  const budget = Number(budgetAgg._sum?.amount ?? 0);
  const commitment = Number(poAgg._sum?.totalAmount ?? 0) + Number(subconAgg._sum?.contractValue ?? 0);
  const existingPr = Number(prAgg._sum?.estimatedTotal ?? 0);
  const remaining = budget - commitment - existingPr;

  return { budget, commitment, existingPr, remaining, within: remaining >= estimatedTotal - 0.001 };
}
