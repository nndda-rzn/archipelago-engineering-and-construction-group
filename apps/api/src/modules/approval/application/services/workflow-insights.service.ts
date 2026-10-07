import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { ConditionEvaluator } from './shared/condition-evaluator';
import { summariseDocumentOutcomes, type TaskOutcomeRow } from './shared/document-outcomes';
import { toConditionGroupLoose as toGroup } from './shared/condition-group-mapper';
import { approvalConditionText } from './shared/approval-condition-text';
import type { WorkflowInsights } from '@aec/api-contracts';

/**
 * Bucket nominal tetap agar sebaran bisa dibandingkan antar waktu.
 *
 * Label memakai **satu satuan** (juta `jt`) untuk semua batas di bawah 1 miliar,
 * lalu `M` untuk miliar. Sebelumnya label mencampur `100jt–1M` dan `1M–10M`
 * sehingga mata harus menebak apakah `M` berarti juta atau miliar.
 */
const AMOUNT_BUCKETS: Array<{ label: string; from: number; to: number }> = [
  { label: '< 10jt', from: 0, to: 10_000_000 },
  { label: '10jt – 100jt', from: 10_000_000, to: 100_000_000 },
  { label: '100jt – 1.000jt', from: 100_000_000, to: 1_000_000_000 },
  { label: '1.000jt – 10.000jt', from: 1_000_000_000, to: 10_000_000_000 },
  { label: '> 10.000jt', from: 10_000_000_000, to: Number.POSITIVE_INFINITY },
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

  async forDefinition(definitionId: string, requestedScope: 'version' | 'type' = 'type'): Promise<WorkflowInsights> {
    const definition = await this.prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!definition) throw new NotFoundException({ code: 'WORKFLOW_NOT_FOUND', message: 'Workflow not found' });

    const transactionType = definition.transactionType;

    // Ambil SELURUH task jenis transaksi ini beserta `definitionId`-nya, lalu
    // putuskan cakupannya di sini. Dengan begitu `versionBreakdown` bisa
    // dilaporkan tanpa query kedua — dan campuran versi terlihat, bukan
    // tersembunyi di balik satu angka.
    const allTasks = await this.prisma.approvalTask.findMany({
      where: { transactionType },
      select: { stepOrder: true, stepName: true, status: true, createdAt: true, decidedAt: true, transactionId: true, definitionId: true },
      orderBy: { createdAt: 'asc' },
    });

    // Versi lain (untuk memberi label pada breakdown) — diambil sekali.
    const otherIds = [...new Set(allTasks.map((t) => t.definitionId).filter((id): id is string => id != null && id !== definitionId))];
    const otherDefs = otherIds.length
      ? await this.prisma.workflowDefinition.findMany({ where: { id: { in: otherIds } }, select: { id: true, code: true, version: true } })
      : [];
    const defById = new Map(otherDefs.map((d) => [d.id, d]));

    const versionBreakdown = this.buildBreakdown(allTasks, definitionId, definition, defById);

    const appliedScope: 'version' | 'type' = requestedScope;
    const tasks = appliedScope === 'version'
      ? allTasks.filter((t) => t.definitionId === definitionId)
      : allTasks;

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

    // Hasil per DOKUMEN — bukan penjumlahan baris langkah (lihat document-outcomes.ts).
    const documents = summariseDocumentOutcomes(tasks as TaskOutcomeRow[]);

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
      condition: approvalConditionText(step),
      matching: amounts.values.filter((value) =>
        this.evaluator.evaluateCondition(
          step as unknown as { conditionField: string | null; conditionOp: string | null; conditionValue: never; conditionGroup?: never },
          value,
        ),
      ).length,
    }));
    const coverage = await Promise.all(
      definition.steps.map(async (step) => {
        const role = await this.prisma.role.findUnique({ where: { code: step.approverRoleCode } });
        if (!role) return { stepOrder: step.stepOrder, roleCode: step.approverRoleCode, holders: 0, holderNames: [] };

        // Nama pemegang, bukan hanya jumlahnya. "1 holder" tidak menjawab
        // "siapa yang harus menyetujui"; nama orangnya yang menjawab.
        const assignments = await this.prisma.userRole.findMany({
          where: { roleId: role.id, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] },
          include: { user: { select: { displayName: true } } },
          orderBy: { effectiveFrom: 'asc' },
        });
        return {
          stepOrder: step.stepOrder,
          roleCode: step.approverRoleCode,
          holders: assignments.length,
          holderNames: assignments.map((a) => a.user.displayName),
        };
      }),
    );

    // Ambang nyata tiap langkah, untuk digambar sebagai garis pada sebaran nilai.
    // Untuk langkah bergrup, ambang diambil dari aturan pertama (garis tunggal
    // tetap bermakna; menyembunyikannya akan membuat sebaran tak terbaca).
    const thresholds = definition.steps
      .map((s) => {
        const group = toGroup(s.conditionGroup);
        if (group && group.conditions[0]) {
          return { stepOrder: s.stepOrder, stepName: s.name, field: group.conditions[0].field, op: group.conditions[0].op, value: Number(group.conditions[0].value) };
        }
        if (s.conditionField != null && s.conditionValue != null) {
          return { stepOrder: s.stepOrder, stepName: s.name, field: s.conditionField, op: s.conditionOp ?? '>', value: Number(s.conditionValue) };
        }
        return null;
      })
      .filter((t): t is { stepOrder: number; stepName: string; field: string; op: string; value: number } => t !== null);

    return {
      transactionType,
      generatedAt: new Date().toISOString(),
      scope: {
        requested: { definitionId: definition.id, code: definition.code, version: definition.version },
        applied: appliedScope,
        taskCount: tasks.length,
        versionBreakdown,
      },
      byStep,
      documents,
      monthly,
      amounts: { count: amounts.values.length, min: amounts.min, max: amounts.max, buckets: amounts.buckets },
      ruleHits,
      coverage,
      thresholds,
      note: INSIGHTS_NOTE,
    };
  }

  /**
   * Sebaran task antar versi. `version: null` untuk task tanpa versi diketahui
   * (task lama sebelum kolom `definitionId` ada, atau submit manual tanpa
   * workflow) — dilaporkan apa adanya, bukan digabung diam-diam ke versi ini.
   */
  private buildBreakdown(
    tasks: Array<{ definitionId: string | null }>,
    currentId: string,
    current: { id: string; code: string; version: number },
    defById: Map<string, { id: string; code: string; version: number }>,
  ): WorkflowInsights['scope']['versionBreakdown'] {
    const counts = new Map<string, number>();
    for (const task of tasks) {
      const key = task.definitionId ?? '__unknown__';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([key, count]) => {
        if (key === '__unknown__') return { definitionId: null, version: null, code: null, tasks: count };
        const def = key === currentId ? current : defById.get(key);
        return {
          definitionId: key,
          version: def?.version ?? null,
          code: def?.code ?? null,
          tasks: count,
        };
      })
      // Versi ini dulu (paling relevan), lalu versi lain, lalu tanpa versi.
      .sort((a, b) => {
        if (a.definitionId === currentId) return -1;
        if (b.definitionId === currentId) return 1;
        if (a.definitionId === null) return 1;
        if (b.definitionId === null) return -1;
        return (b.version ?? 0) - (a.version ?? 0);
      });
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
      // Batas dikirim ke klien supaya ia tidak perlu menebak rentang dari label.
      from: b.from,
      to: b.to === Number.POSITIVE_INFINITY ? null : b.to,
    }));

    return {
      values: raw,
      min: raw.length ? Math.min(...raw) : null,
      max: raw.length ? Math.max(...raw) : null,
      buckets,
    };
  }
}
