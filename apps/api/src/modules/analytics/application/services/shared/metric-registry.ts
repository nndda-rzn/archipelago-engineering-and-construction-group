import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '@/shared/database/prisma.service';

/**
 * Registry metrik analitis — SUMBER TUNGGAL definisi setiap metrik.
 *
 * Setiap metrik memetakan nama → { label, unit, dimensi yang diizinkan, dan
 * `rows()` } yang mengembalikan baris mentah `{ key, label, date, value }`
 * untuk sebuah dimensi. Trend-series & decomposition membaca dari peta yang
 * sama sehingga tidak pernah ada dua definisi metrik yang berbeda.
 */

export type MetricKey = 'cashIn' | 'cashOut' | 'netCash' | 'cost' | 'revenue' | 'budget' | 'contractValue';
export type DimensionKey = 'entity' | 'project' | 'costType' | 'client';

export interface MetricRow {
  key: string;
  label: string;
  date: Date;
  value: number;
}

export interface ResolvedFilter {
  legalEntityId?: string;
  from?: Date;
  to?: Date;
}

export interface MetricDefinition {
  label: string;
  unit: string;
  allowedDimensions: DimensionKey[];
  rows(prisma: PrismaService, filter: ResolvedFilter, dimension: DimensionKey): Promise<MetricRow[]>;
}

const METRIC_KEYS: MetricKey[] = ['cashIn', 'cashOut', 'netCash', 'cost', 'revenue', 'budget', 'contractValue'];
const DIMENSION_KEYS: DimensionKey[] = ['entity', 'project', 'costType', 'client'];

export function isMetricKey(value: string | undefined): value is MetricKey {
  return value != null && (METRIC_KEYS as string[]).includes(value);
}

export function isDimensionKey(value: string | undefined): value is DimensionKey {
  return value != null && (DIMENSION_KEYS as string[]).includes(value);
}

/** Batas tanggal per baris: `{ gte, lte }` hanya bila filter memberi nilainya. */
function dateWhere(filter: ResolvedFilter): { gte?: Date; lte?: Date } | undefined {
  return filter.from || filter.to ? { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } : undefined;
}

/** Scope entitas untuk tabel yang punya `project.legalEntityId`. */
function projectEntityScope(filter: ResolvedFilter): Record<string, unknown> {
  return filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
}

/** Peta `projectId → { code, name, entityCode, entityName }` — sekali query, hindari N+1. */
interface ProjectMeta {
  code: string;
  name: string;
  entityCode: string | null;
  entityName: string | null;
}

async function loadProjectMeta(prisma: PrismaService, ids: string[]): Promise<Map<string, ProjectMeta>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await prisma.project.findMany({
    where: { id: { in: unique } },
    select: { id: true, code: true, name: true, legalEntity: { select: { code: true, name: true } } },
  });
  return new Map(
    rows.map((p) => [
      p.id,
      { code: p.code, name: p.name, entityCode: p.legalEntity?.code ?? null, entityName: p.legalEntity?.name ?? null },
    ]),
  );
}

/**
 * Ubah baris mentah (projectId + label dimensi) menjadi `MetricRow` untuk
 * dimensi terpilih. `sign` membalik nilai (dipakai netCash untuk sisi payment).
 */
function toMetricRows(
  raw: { projectId: string; label: string; date: Date; amount: number }[],
  dimension: DimensionKey,
  meta: Map<string, ProjectMeta>,
  sign: 1 | -1 = 1,
): MetricRow[] {
  return raw.map((r) => {
    const m = meta.get(r.projectId);
    let key: string;
    let label: string;
    switch (dimension) {
      case 'project':
        key = m?.code ?? r.projectId;
        label = m?.name ?? r.projectId;
        break;
      case 'entity':
        key = m?.entityCode ?? 'UNKNOWN';
        label = m?.entityName ?? 'Unknown entity';
        break;
      case 'costType':
      case 'client':
      default:
        key = r.label;
        label = r.label;
        break;
    }
    return { key, label, date: r.date, value: Math.round(r.amount * sign * 100) / 100 };
  });
}

/** Metrik yang hanya dijumlahkan dari satu tabel dengan kolom tanggal/amount tetap. */
interface SimpleSource {
  model: 'collection' | 'payment' | 'vendorInvoice' | 'clientInvoice' | 'budgetItem';
  statusField?: 'status';
  status?: string;
  dateField: 'collectedAt' | 'paymentDate' | 'invoiceDate' | 'createdAt';
  amountField: 'totalAmount' | 'amount';
  labelField: 'client' | 'vendor' | 'costType';
  sign: 1 | -1;
}

const SIMPLE: Record<'cashIn' | 'cashOut' | 'cost' | 'revenue' | 'budget', SimpleSource> = {
  cashIn: { model: 'collection', status: 'POSTED', dateField: 'collectedAt', amountField: 'totalAmount', labelField: 'client', sign: 1 },
  cashOut: { model: 'payment', status: 'PAID', dateField: 'paymentDate', amountField: 'totalAmount', labelField: 'vendor', sign: 1 },
  cost: { model: 'vendorInvoice', status: 'POSTED', dateField: 'invoiceDate', amountField: 'totalAmount', labelField: 'vendor', sign: 1 },
  revenue: { model: 'clientInvoice', status: 'POSTED', dateField: 'invoiceDate', amountField: 'totalAmount', labelField: 'client', sign: 1 },
  budget: { model: 'budgetItem', status: 'PUBLISHED', dateField: 'createdAt', amountField: 'amount', labelField: 'costType', sign: 1 },
};

async function simpleRows(
  prisma: PrismaService,
  source: SimpleSource,
  filter: ResolvedFilter,
  dimension: DimensionKey,
): Promise<MetricRow[]> {
  const dw = dateWhere(filter);
  const where: Record<string, unknown> = {
    ...(source.status ? { status: source.status } : {}),
    ...projectEntityScope(filter),
    ...(dw ? { [source.dateField]: dw } : {}),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await (prisma as any)[source.model].findMany({
    where,
    select: { projectId: true, [source.dateField]: true, [source.amountField]: true, [source.labelField]: true },
  });
  const meta = await loadProjectMeta(prisma, rows.map((r) => r.projectId));
  const raw = rows.map((r) => ({
    projectId: r.projectId,
    label: String(r[source.labelField] ?? '—'),
    date: new Date(r[source.dateField]),
    amount: Number(r[source.amountField] ?? 0),
  }));
  return toMetricRows(raw, dimension, meta, source.sign);
}

/** contractValue hidup di tabel Project sendiri (bukan transaksi). */
async function contractValueRows(prisma: PrismaService, filter: ResolvedFilter, dimension: DimensionKey): Promise<MetricRow[]> {
  const dw = dateWhere(filter);
  const rows = await prisma.project.findMany({
    where: { ...(filter.legalEntityId ? { legalEntityId: filter.legalEntityId } : {}), ...(dw ? { createdAt: dw } : {}) },
    select: { id: true, code: true, name: true, client: true, contractValue: true, createdAt: true, legalEntity: { select: { code: true, name: true } } },
  });
  const meta = new Map(
    rows.map((p) => [p.id, { code: p.code, name: p.name, entityCode: p.legalEntity?.code ?? null, entityName: p.legalEntity?.name ?? null }]),
  );
  const raw = rows.map((p) => ({ projectId: p.id, label: p.client, date: new Date(p.createdAt), amount: Number(p.contractValue ?? 0) }));
  return toMetricRows(raw, dimension, meta, 1);
}

function definition(
  label: string,
  allowedDimensions: DimensionKey[],
  rows: MetricDefinition['rows'],
): MetricDefinition {
  return { label, unit: 'idr', allowedDimensions, rows };
}

export const METRICS: Record<MetricKey, MetricDefinition> = {
  cashIn: definition('Cash collected', ['entity', 'project', 'client'], (p, f, d) => simpleRows(p, SIMPLE.cashIn, f, d)),
  cashOut: definition('Cash paid', ['entity', 'project', 'client'], (p, f, d) => simpleRows(p, SIMPLE.cashOut, f, d)),
  cost: definition('Actual cost', ['entity', 'project', 'client'], (p, f, d) => simpleRows(p, SIMPLE.cost, f, d)),
  revenue: definition('Revenue', ['entity', 'project', 'client'], (p, f, d) => simpleRows(p, SIMPLE.revenue, f, d)),
  budget: definition('Budget (published)', ['entity', 'project', 'costType'], (p, f, d) => simpleRows(p, SIMPLE.budget, f, d)),
  contractValue: definition('Contract value', ['entity', 'project', 'client'], (p, f, d) => contractValueRows(p, f, d)),
  netCash: definition('Net cash flow', ['entity', 'project', 'client'], async (p, f, d) => [
    ...(await simpleRows(p, SIMPLE.cashIn, f, d)),
    ...(await simpleRows(p, { ...SIMPLE.cashOut, sign: -1 }, f, d)),
  ]),
};

/**
 * Ambil baris mentah untuk `metric × dimension`. Melempar 400
 * `UNSUPPORTED_DECOMPOSITION` bila kombinasinya tidak didukung — bukan
 * mengembalikan daftar kosong yang akan terbaca sebagai "tidak ada data".
 */
export async function resolveRows(
  metric: MetricKey,
  dimension: DimensionKey,
  prisma: PrismaService,
  filter: ResolvedFilter,
): Promise<MetricRow[]> {
  const def = METRICS[metric];
  if (!def.allowedDimensions.includes(dimension)) {
    throw new BadRequestException({
      code: 'UNSUPPORTED_DECOMPOSITION',
      message: `metric ${metric} does not support dimension ${dimension}`,
    });
  }
  return def.rows(prisma, filter, dimension);
}
