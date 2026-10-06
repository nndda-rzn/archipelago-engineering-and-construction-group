import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ConditionEvaluator } from './shared/condition-evaluator';
import type { WorkflowInsights } from '@aec/api-contracts';

/** Bucket nominal tetap agar sebaran bisa dibandingkan antar waktu. */
const AMOUNT_BUCKETS: Array<{ label: string; from: number; to: number }> = [
  { label: '< 10jt', from: 0, to: 10_000_000 },
  { label: '10–100jt', from: 10_000_000, to: 100_000_000 },
  { label: '100jt–1M', from: 100_000_000, to: 1_000_000_000 },
  { label: '1M–10M', from: 1_000_000_000, to: 10_000_000_000 },
  { label: '> 10M', from: 10_000_000_000, to: Number.POSITIVE_INFINITY },
];

const INSIGHTS_NOTE =
  'Based on recorded approval tasks for this transaction type. Steps may have changed between versions, so older tasks are not necessarily comparable with the current definition.';

/** `2026-10-06T…` → `2026-10` (UTC, sama seperti modul analytics). */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Insight operasional sebuah definisi: di mana dokumen menumpuk, bagaimana
 * hasilnya, seberapa besar nominalnya, berapa yang kena syarat, dan apakah role
 * tiap langkah benar-benar dipegang seseorang.
 */
@Injectable()
export class WorkflowInsightsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConditionEvaluator) private readonly evaluator: ConditionEvaluator,
  ) {}

  async forDefinition(definitionId: string): Promise<WorkflowInsights> {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });

    const transactionType = definition.transactionType;
    const tasks = await this.prisma.approvalTask.findMany({
      where: { transactionType },
      select: { stepOrder: true, stepName: true, status: true, createdAt: true, decidedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byStepMap = new Map<number, { stepOrder: number; stepName: string; total: number; approved: number; rejected: number; pending: number; cancelled: number }>();
    for (const task of tasks) {
      const row = byStepMap.get(task.stepOrder) ?? {
        stepOrder: task.stepOrder, stepName: task.stepName, total: 0, approved: 0, rejected: 0, pending: 0, cancelled: 0,
      };
      row.total += 1;
      if (task.status === 'APPROVED') row.approved += 1;
      else if (task.status === 'REJECTED') row.rejected += 1;
      else if (task.status === 'PENDING') row.pending += 1;
      else if (task.status === 'CANCELLED') row.cancelled += 1;
      byStepMap.set(task.stepOrder, row);
    }
    const byStep = [...byStepMap.values()].sort((a, b) => a.stepOrder - b.stepOrder);

    const monthlyMap = new Map<string, { month: string; created: number; decided: number }>();
    for (const task of tasks) {
      const created = monthKey(task.createdAt);
      const createdRow = monthlyMap.get(created) ?? { month: created, created: 0, decided: 0 };
      createdRow.created += 1;
      monthlyMap.set(created, createdRow);

      if (task.decidedAt) {
        const decided = monthKey(task.decidedAt);
        const decidedRow = monthlyMap.get(decided) ?? { month: decided, created: 0, decided: 0 };
        decidedRow.decided += 1;
        monthlyMap.set(decided, decidedRow);
      }
    }
    const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

    const amounts = await this.documentAmounts(transactionType);

    // Berapa dokumen yang benar-benar memenuhi syarat tiap langkah definisi ini.
    const ruleHits = definition.steps.map((step) => ({
      stepOrder: step.stepOrder,
      name: step.name,
      condition: this.conditionText(step),
      matching: amounts.values.filter((value) =>
        this.evaluator.evaluateCondition(
          step as unknown as { conditionField: string | null; conditionOp: string | null; conditionValue: never },
          value,
        ),
      ).length,
    }));

    const coverage = await Promise.all(
      definition.steps.map(async (step) => {
        const role = await this.prisma.role.findUnique({ where: { code: step.approverRoleCode } });
        const holders = role
          ? await this.prisma.userRole.count({
              where: { roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
            })
          : 0;
        return { stepOrder: step.stepOrder, roleCode: step.approverRoleCode, holders };
      }),
    );

    return {
      transactionType,
      generatedAt: new Date().toISOString(),
      byStep,
      monthly,
      amounts: { count: amounts.values.length, min: amounts.min, max: amounts.max, buckets: amounts.buckets },
      ruleHits,
      coverage,
      note: INSIGHTS_NOTE,
    };
  }

  private conditionText(step: { conditionField: string | null; conditionOp: string | null; conditionValue: unknown }): string | null {
    if (!step.conditionField || !step.conditionOp || step.conditionValue == null) return null;
    const op = step.conditionOp === '==' ? '=' : step.conditionOp;
    return `${step.conditionField} ${op} ${Number(step.conditionValue).toLocaleString('id-ID')}`;
  }

  /** Nominal dokumen untuk jenis transaksi ini + sebaran bucket tetap. */
  private async documentAmounts(transactionType: string) {
    const raw: Array<number> = [];
    if (transactionType === 'PurchaseRequisition') {
      const rows = await this.prisma.purchaseRequisition.findMany({ select: { estimatedTotal: true } });
      for (const r of rows) if (r.estimatedTotal != null) raw.push(Number(r.estimatedTotal));
    } else if (transactionType === 'PurchaseOrder') {
      const rows = await this.prisma.purchaseOrder.findMany({ select: { totalAmount: true } });
      for (const r of rows) raw.push(Number(r.totalAmount));
    }

    const buckets = AMOUNT_BUCKETS.map((b) => ({
      label: b.label,
      count: raw.filter((v) => v >= b.from && v < b.to).length,
    }));

    return {
      values: raw,
      min: raw.length ? Math.min(...raw) : null,
      max: raw.length ? Math.max(...raw) : null,
      buckets,
    };
  }
}
