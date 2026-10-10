# `/analytics` Analytical Workspace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/analytics` as the "why & how it trends" surface — time-series with period comparison, contribution decomposition, and rankings/distributions — removing its duplication of the `/` Control Tower.

**Architecture:** Two additive read-only endpoints (`/analytics/trend-series`, `/analytics/decomposition`) backed by a single metric registry, so every metric has exactly one definition. The page becomes 5 zones (Scope, Trend explorer, What moved it, Rankings, Distributions). Anomaly triage and the mislabeled "bank balances" champion leave `/analytics`.

**Tech Stack:** NestJS 10 + Prisma (PostgreSQL) · React 18 + TanStack Query/Router · Tailwind token preset · recharts 3 · Vitest + RTL (web) · Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-12-analytics-workspace-design.md`

## Global Constraints

- All user-facing copy in English; money/date formatting stays `id-ID` (`shared/lib/format.ts`).
- Every number renders `font-mono tabular-nums`.
- Charts import colour only from `widgets/dashboard-charts/chart-colors.ts` — never write a new hex literal.
- No metric-card grid as the page backbone; no eyebrow uppercase labels beyond section titles; no decorative pills; no gradients, glow, or entrance animations.
- Every chart carries a non-colour partner (`role="img"` + `aria-label`) and an adjacent text value.
- Errors first: no zone formats a number before handling `isError` (`role="alert"` + retry); never render `Rp 0` for unknown data.
- Backend changes are additive: with no params the existing endpoints behave exactly as before.
- `budget` metric = `BudgetItem` with `status: 'PUBLISHED'` everywhere.
- One requirement = one branch, PR base `develop`, merge commit (no squash).
- Web tests `*.test.tsx` beside source (Vitest); API unit tests `*.spec.ts` beside source (Jest).

## Review Focus

1. **A metric with no rows in the period** must return `points` filled with `0` for each period in the range (not an empty array) and `total = 0` — the chart shape must stay stable.
2. **`compare=previous` on a period with no previous data** must return `comparePoints` of zeros (not `null`, not omitted) so the overlay line is honest rather than absent.
3. **Decomposition with more contributors than `limit`** must place the remainder in `others` such that `Σ items.value + others.value === total` exactly.
4. **An unsupported `metric × dimension` pair** must throw 400 `UNSUPPORTED_DECOMPOSITION` (never return an empty list, which would read as "no data").
5. **A `netCash` decomposition** (derived metric, no single table) must produce per-dimension values equal to that dimension's `cashIn − cashOut`, and still reconcile to `total`.

---

### Task 1: Metric registry (`metric-registry.ts`)

The single source of truth for metric definitions. Every metric maps a name to a label, unit, allowed dimensions, and a `rows()` function that returns raw `{ key, label, date, value }` rows for a given dimension.

**Files:**
- Create: `apps/api/src/modules/analytics/application/services/shared/metric-registry.ts`
- Test: `apps/api/src/modules/analytics/application/services/shared/metric-registry.spec.ts`

**Interfaces:**
- Produces:
  - `type MetricKey = 'cashIn' | 'cashOut' | 'netCash' | 'cost' | 'revenue' | 'budget' | 'contractValue'`
  - `type DimensionKey = 'entity' | 'project' | 'costType' | 'client'`
  - `interface MetricRow { key: string; label: string; date: Date; value: number }`
  - `interface ResolvedFilter { legalEntityId?: string; from?: Date; to?: Date }`
  - `interface MetricDefinition { label: string; unit: string; allowedDimensions: DimensionKey[]; rows(prisma: PrismaService, filter: ResolvedFilter, dimension: DimensionKey): Promise<MetricRow[]> }`
  - `const METRICS: Record<MetricKey, MetricDefinition>`
  - `function isMetricKey(value: string): value is MetricKey`
  - `function isDimensionKey(value: string): value is DimensionKey`
  - `function resolveRows(metric: MetricKey, dimension: DimensionKey, prisma: PrismaService, filter: ResolvedFilter): Promise<MetricRow[]>`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/analytics/application/services/shared/metric-registry.spec.ts
import { METRICS, isMetricKey, isDimensionKey, resolveRows } from './metric-registry';

describe('metric-registry', () => {
  it('declares allowed dimensions per metric', () => {
    expect(METRICS.budget.allowedDimensions).toEqual(['entity', 'project', 'costType']);
    expect(METRICS.cashIn.allowedDimensions).toEqual(['entity', 'project', 'client']);
    expect(METRICS.netCash.unit).toBe('idr');
  });

  it('rejects an unsupported metric × dimension pair', async () => {
    const prisma = {} as never;
    await expect(resolveRows('cashIn', 'costType', prisma, {})).rejects.toThrow(/UNSUPPORTED_DECOMPOSITION/);
  });

  it('guards metric/dimension strings', () => {
    expect(isMetricKey('cashIn')).toBe(true);
    expect(isMetricKey('nope')).toBe(false);
    expect(isDimensionKey('project')).toBe(true);
    expect(isDimensionKey('nope')).toBe(false);
  });

  it('netCash returns signed rows: collections positive, payments negative', async () => {
    const prisma = {
      collection: { findMany: async () => [{ projectId: 'p1', client: 'Acme', collectedAt: new Date('2026-01-10'), totalAmount: 100 }] },
      payment: { findMany: async () => [{ projectId: 'p1', vendor: 'V', paymentDate: new Date('2026-01-12'), totalAmount: 40 }] },
      project: { findMany: async () => [{ id: 'p1', code: 'P1', name: 'One', legalEntity: { code: 'LE1', name: 'Ent' } }] },
    } as never;
    const rows = await resolveRows('netCash', 'project', prisma, {});
    expect(rows.map((r) => r.value).sort((a, b) => a - b)).toEqual([-40, 100]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- metric-registry`
Expected: FAIL — `Cannot find module './metric-registry'`.

- [ ] **Step 3: Implement the registry**

Each metric's `rows()` queries Prisma for the given dimension and maps to `MetricRow`:
- `cashIn` → `collection.findMany({ where: { status: 'POSTED', ...scope }, select: { projectId, client, collectedAt, totalAmount } })`; date = `collectedAt`.
- `cashOut` → `payment.findMany({ where: { status: 'PAID', ...scope }, select: { projectId, vendor, paymentDate, totalAmount } })`; date = `paymentDate`.
- `netCash` → concat `cashIn.rows()` (value `+amount`) and `cashOut.rows()` (value `-amount`).
- `cost` → `vendorInvoice.findMany({ where: { status: 'POSTED', ...scope }, select: { projectId, vendor, invoiceDate, totalAmount } })`; date = `invoiceDate`.
- `revenue` → `clientInvoice.findMany({ where: { status: 'POSTED', ...scope }, select: { projectId, client, invoiceDate, totalAmount } })`; date = `invoiceDate`.
- `budget` → `budgetItem.findMany({ where: { status: 'PUBLISHED', ...scope }, select: { projectId, costType, createdAt, amount } })`; date = `createdAt`.
- `contractValue` → `project.findMany({ where: { ...entityScope }, select: { id, code, name, client, legalEntityId, legalEntity: { select: { code, name } }, contractValue, createdAt } })`; date = `createdAt`, value = `Number(contractValue ?? 0)`.

`key`/`label` per dimension: `entity` → key `legalEntityId`, label `legalEntity.name ?? code`; `project` → key `project.code`, label `project.name`; `client` → key the `client`/`vendor` string, label same; `costType` → key/label the `costType`. Resolve the project/entity join in a single `project.findMany` map keyed by `projectId` (avoid N+1). `resolveRows` throws `BadRequestException({ code: 'UNSUPPORTED_DECOMPOSITION', message: 'metric <m> does not support dimension <d>' })` when the pair is not in `allowedDimensions`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- metric-registry`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/application/services/shared/metric-registry.ts apps/api/src/modules/analytics/application/services/shared/metric-registry.spec.ts
git commit -m "feat(analytics): single metric registry for trend & decomposition"
```

---

### Task 2: `trend-series.service.ts`

**Files:**
- Create: `apps/api/src/modules/analytics/application/services/shared/period-bucket.ts`
- Create: `apps/api/src/modules/analytics/application/services/trend-series.service.ts`
- Test: `apps/api/src/modules/analytics/application/services/shared/period-bucket.spec.ts`
- Test: `apps/api/src/modules/analytics/application/services/trend-series.service.spec.ts`

**Interfaces:**
- Consumes: `resolveRows`, `MetricKey`, `ResolvedFilter` (Task 1); `resolveDateRange` (`@/shared/utils/date-range`); `analyticsCacheKey` (`@/shared/cache/analytics-cache`); `computeDelta` (`./shared/analytics-metrics`).
- Produces:
  - `period-bucket.ts`: `function bucketOf(date: Date, bucket: 'month' | 'quarter'): string` (→ `'2026-01'` / `'2026-Q1'`); `function periodsBetween(from: Date, to: Date, bucket: 'month' | 'quarter'): string[]`.
  - `TrendSeriesService.series(input: { metric: MetricKey; legalEntityId?: string; from?: string; to?: string; bucket?: 'month' | 'quarter'; compare?: 'previous' }): Promise<TrendSeries>`.

- [ ] **Step 1: Write the failing test (bucket helper)**

```ts
// period-bucket.spec.ts
import { bucketOf, periodsBetween } from './period-bucket';

describe('period-bucket', () => {
  it('buckets by month and quarter (UTC)', () => {
    expect(bucketOf(new Date('2026-02-15T00:00:00Z'), 'month')).toBe('2026-02');
    expect(bucketOf(new Date('2026-05-01T00:00:00Z'), 'quarter')).toBe('2026-Q2');
  });

  it('enumerates periods inclusively', () => {
    expect(periodsBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-03-31T00:00:00Z'), 'month'))
      .toEqual(['2026-01', '2026-02', '2026-03']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- period-bucket`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `period-bucket.ts`**

`bucketOf`: month → `YYYY-MM`; quarter → `YYYY-Q${Math.floor(month/3)+1}` (UTC). `periodsBetween`: walk month by month (or quarter by quarter) from the bucket of `from` to the bucket of `to`, inclusive, ascending.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- period-bucket`
Expected: PASS.

- [ ] **Step 5: Write the failing service test**

```ts
// trend-series.service.spec.ts
import { TrendSeriesService } from './trend-series.service';

function svc(rows: { key: string; label: string; date: Date; value: number }[]) {
  const prisma = {} as never;
  const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
  const registry = { resolveRows: async () => rows } as never;
  return new TrendSeriesService(prisma, cache, registry);
}

describe('TrendSeriesService', () => {
  it('fills empty periods with 0 and sums the total', async () => {
    const s = svc([{ key: 'p1', label: 'P1', date: new Date('2026-01-10T00:00:00Z'), value: 100 }]);
    const out = await s.series({ metric: 'cashIn', from: '2026-01-01', to: '2026-03-31', bucket: 'month' });
    expect(out.points).toEqual([
      { period: '2026-01', value: 100 },
      { period: '2026-02', value: 0 },
      { period: '2026-03', value: 0 },
    ]);
    expect(out.total).toBe(100);
  });

  it('adds comparePoints (zeros) when compare=previous has no data', async () => {
    const s = svc([]);
    const out = await s.series({ metric: 'cashIn', from: '2026-01-01', to: '2026-03-31', compare: 'previous' });
    expect(out.comparePoints).toHaveLength(out.points.length);
    expect(out.comparePoints!.every((p) => p.value === 0)).toBe(true);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- trend-series`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement `TrendSeriesService`**

Constructor injects `PrismaService`, `CacheService`, and `MetricRegistry` (a small injectable wrapper exposing `resolveRows`, registered in `analytics.module.ts`). `series()`:
1. `resolveDateRange(from, to)`; default range = last 12 months when both absent.
2. `resolveRows(metric, 'project', prisma, filter)` — trend always aggregates across all dimensions (dimension-independent total).
3. `periods = periodsBetween(from, to, bucket ?? 'month')`; sum `value` into each bucket by `bucketOf(row.date, bucket)`; emit `{ period, value }` for every period in `periods` (0 when empty).
4. `total` = Σ values. If `compare === 'previous'`: compute the previous range by shifting back by the span (`to - from`), fetch those rows, build `comparePoints` over the same number of periods; `delta = computeDelta(total, compareTotal)`.
5. `cache.wrap(analyticsCacheKey('analytics:trend-series:' + metric, filter), 60, …)`; include `metric`, `unit`, `bucket`, `generatedAt`.

- [ ] **Step 8: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- trend-series`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/analytics/application/services/shared/period-bucket.* apps/api/src/modules/analytics/application/services/trend-series.service.*
git commit -m "feat(analytics): trend-series service with period comparison"
```

---

### Task 3: `decomposition.service.ts`

**Files:**
- Create: `apps/api/src/modules/analytics/application/services/decomposition.service.ts`
- Test: `apps/api/src/modules/analytics/application/services/decomposition.service.spec.ts`

**Interfaces:**
- Consumes: `resolveRows`, `MetricKey`, `DimensionKey`, `ResolvedFilter` (Task 1); `resolveDateRange`; `analyticsCacheKey`.
- Produces: `DecompositionService.decomposition(input: { metric: MetricKey; dimension: DimensionKey; legalEntityId?: string; from?: string; to?: string; limit?: number; compare?: 'previous' }): Promise<Decomposition>` where `Decomposition = { metric; dimension; items: { key; label; value; share; previousValue?; delta? }[]; total; previousTotal?; others: { value; previousValue? }; generatedAt }`.

- [ ] **Step 1: Write the failing test**

```ts
// decomposition.service.spec.ts
import { DecompositionService } from './decomposition.service';

function svc(rows: { key: string; label: string; date: Date; value: number }[]) {
  const prisma = {} as never;
  const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
  const registry = { resolveRows: async () => rows } as never;
  return new DecompositionService(prisma, cache, registry);
}

const r = (key: string, value: number) => ({ key, label: key, date: new Date('2026-01-01T00:00:00Z'), value });

describe('DecompositionService', () => {
  it('groups by key, sorts desc, and reconciles items + others = total', async () => {
    const s = svc([r('a', 50), r('a', 30), r('b', 20), r('c', 10), r('d', 5)]);
    const out = await s.decomposition({ metric: 'cashIn', dimension: 'client', limit: 2 });
    expect(out.items.map((i) => [i.key, i.value])).toEqual([['a', 80], ['b', 20]]);
    expect(out.others.value).toBe(15);
    expect(out.items.reduce((s2, i) => s2 + i.value, 0) + out.others.value).toBe(out.total);
    expect(out.total).toBe(115);
    expect(out.items[0].share).toBeCloseTo(80 / 115, 3);
  });

  it('keeps a zero-count dimension stage present in output when present in data', async () => {
    const s = svc([]);
    const out = await s.decomposition({ metric: 'budget', dimension: 'costType' });
    expect(out.items).toEqual([]);
    expect(out.total).toBe(0);
    expect(out.others.value).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- decomposition`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `DecompositionService`**

Constructor injects `PrismaService`, `CacheService`, `MetricRegistry`. `decomposition()`:
1. `resolveDateRange(from, to)`; default = all time when absent.
2. `resolveRows(metric, dimension, prisma, filter)`.
3. Group by `key` (sum `value`, keep first `label`); sort by `value` desc.
4. `total` = Σ all values. Take first `limit` (default 10) as `items`; `others.value` = Σ of the rest. `share` = `value / total` (0 when total 0).
5. If `compare === 'previous'`: repeat over the shifted range, attach `previousValue` per item and `previousTotal`; `delta` per item via `computeDelta`.
6. `cache.wrap(analyticsCacheKey('analytics:decomposition:' + metric + ':' + dimension, filter), 60, …)`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- decomposition`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/application/services/decomposition.service.*
git commit -m "feat(analytics): decomposition service with top-N and others"
```

---

### Task 4: Contracts (`@aec/api-contracts`)

**Files:**
- Modify: `packages/api-contracts/src/analytics.ts` (append after `controlTowerSchema`)
- Test: `packages/api-contracts/src/analytics.spec.ts` (create if absent)

**Interfaces:**
- Produces: `trendSeriesSchema`, `trendSeriesPointSchema`, `type TrendSeries`; `decompositionSchema`, `decompositionItemSchema`, `type Decomposition`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/api-contracts/src/analytics.spec.ts
import { trendSeriesSchema, decompositionSchema } from './analytics';

describe('analytics contracts', () => {
  it('parses a trend series with comparePoints', () => {
    const parsed = trendSeriesSchema.parse({
      metric: 'cashIn', unit: 'idr', bucket: 'month',
      points: [{ period: '2026-01', value: 100 }],
      comparePoints: [{ period: '2026-01', value: 0 }],
      total: 100, generatedAt: new Date().toISOString(),
    });
    expect(parsed.points[0].value).toBe(100);
  });

  it('parses a decomposition with others', () => {
    const parsed = decompositionSchema.parse({
      metric: 'cashIn', dimension: 'client',
      items: [{ key: 'a', label: 'A', value: 80, share: 0.7 }],
      total: 115, others: { value: 15 }, generatedAt: new Date().toISOString(),
    });
    expect(parsed.others.value).toBe(15);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api-contracts test` (or `pnpm --filter @aec/api test:unit -- analytics.spec` if the package has no test script — check `packages/api-contracts/package.json`; if none, verify via `pnpm --filter @aec/api test:unit` after Task 5).
Expected: FAIL — `trendSeriesSchema is not exported`.

- [ ] **Step 3: Implement the schemas**

```ts
export const trendSeriesPointSchema = z.object({ period: z.string(), value: z.number() });
export const trendSeriesSchema = z.object({
  metric: z.string(),
  unit: z.string(),
  bucket: z.enum(['month', 'quarter']),
  points: z.array(trendSeriesPointSchema),
  comparePoints: z.array(trendSeriesPointSchema).optional(),
  total: z.number(),
  compareTotal: z.number().optional(),
  delta: z.object({ current: z.number(), previous: z.number(), pctChange: z.number().nullable(), direction: z.enum(['up', 'down', 'flat']) }).optional(),
  generatedAt: z.string(),
});
export type TrendSeries = z.infer<typeof trendSeriesSchema>;

export const decompositionItemSchema = z.object({
  key: z.string(), label: z.string(), value: z.number(), share: z.number(),
  previousValue: z.number().optional(),
  delta: z.object({ current: z.number(), previous: z.number(), pctChange: z.number().nullable(), direction: z.enum(['up', 'down', 'flat']) }).optional(),
});
export const decompositionSchema = z.object({
  metric: z.string(), dimension: z.string(),
  items: z.array(decompositionItemSchema),
  total: z.number(), previousTotal: z.number().optional(),
  others: z.object({ value: z.number(), previousValue: z.number().optional() }),
  generatedAt: z.string(),
});
export type Decomposition = z.infer<typeof decompositionSchema>;
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api-contracts test` (or the equivalent determined in Step 2).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/analytics.ts packages/api-contracts/src/analytics.spec.ts
git commit -m "feat(contracts): trend-series & decomposition schemas"
```

---

### Task 5: Controller, module, and facade wiring

**Files:**
- Create: `apps/api/src/modules/analytics/application/services/shared/metric-registry.provider.ts` (injectable wrapper)
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.ts`
- Modify: `apps/api/src/modules/analytics/analytics.module.ts`
- Modify: `apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts`
- Test: `apps/api/src/modules/analytics/application/services/analytics.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `TrendSeriesService` (Task 2), `DecompositionService` (Task 3), `MetricKey`/`DimensionKey` + `isMetricKey`/`isDimensionKey` (Task 1), `trendSeriesSchema`/`decompositionSchema` (Task 4).
- Produces: `AnalyticsService.trendSeries(...)`, `AnalyticsService.decomposition(...)`; `MetricRegistry` injectable with `resolveRows(...)` delegating to Task 1's `resolveRows`.

- [ ] **Step 1: Write the failing test**

```ts
// extend analytics.service.spec.ts
import { TrendSeriesService } from './trend-series.service';
import { DecompositionService } from './decomposition.service';

it('facade delegates trendSeries and decomposition', async () => {
  const trend = { series: jest.fn().mockResolvedValue({ points: [] }) } as never;
  const decomp = { decomposition: jest.fn().mockResolvedValue({ items: [] }) } as never;
  const svc = new AnalyticsService(
    {} as never, {} as never, {} as never, {} as never, {} as never, trend, decomp,
  );
  await svc.trendSeries({ metric: 'cashIn' } as never);
  await svc.decomposition({ metric: 'cashIn', dimension: 'client' } as never);
  expect((trend as { series: jest.Mock }).series).toHaveBeenCalled();
  expect((decomp as { decomposition: jest.Mock }).decomposition).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: FAIL — `AnalyticsService` constructor arity mismatch.

- [ ] **Step 3: Implement wiring**

- `metric-registry.provider.ts`: `@Injectable() export class MetricRegistry { resolveRows = (metric, dimension, prisma, filter) => resolveRows(metric, dimension, prisma, filter); }` (thin injectable so services can depend on it and tests can stub it).
- `analytics.module.ts`: add `MetricRegistry`, `TrendSeriesService`, `DecompositionService` to `providers`.
- `analytics.service.ts`: inject both services; add `trendSeries(input)` and `decomposition(input)` delegating. Keep the facade pattern (controller unchanged in shape).
- `analytics.controller.ts`: add two routes —
  - `@Get('trend-series') @Permissions(Permission.AnalyticsView) trendSeries(@Query() q: AnalyticsFilterParams, @Query('metric') metric?: string, @Query('bucket') bucket?: string, @Query('compare') compare?: string)`: validate `isMetricKey(metric)` else 400 `UNSUPPORTED_METRIC`; `bucket` default `month`; `compare === 'previous'`; delegate.
  - `@Get('decomposition') @Permissions(Permission.AnalyticsView) decomposition(@Query() q, @Query('metric') metric?, @Query('dimension') dimension?, @Query('limit') limit?, @Query('compare') compare?)`: validate keys else 400 `UNSUPPORTED_METRIC` / `UNSUPPORTED_DECOMPOSITION`; `limit` default 10; delegate.

  Place both routes **before** any `:id`-style route (there is none here, but keep static routes grouped).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: PASS.

- [ ] **Step 5: Typecheck the API**

Run: `pnpm --filter @aec/api typecheck`
Expected: PASS (0 errors).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/analytics
git commit -m "feat(analytics): expose trend-series & decomposition endpoints"
```

---

### Task 6: Align `budget` metric to PUBLISHED

`cost-composition` and `project-cost-summary` currently aggregate `BudgetItem` without a status filter; every other analytics surface uses `PUBLISHED`. This makes "budget" mean the same thing everywhere.

**Files:**
- Modify: `apps/api/src/modules/analytics/application/services/project-analytics.service.ts:17-19` (costComposition), `:33` (projectCostSummary budget groupBy)
- Test: `apps/api/src/modules/analytics/application/services/analytics.service.spec.ts` (extend)

**Interfaces:**
- No signature change; the where-clause gains `status: 'PUBLISHED'`.

- [ ] **Step 1: Write the failing test**

```ts
it('costComposition aggregates only PUBLISHED budget items', async () => {
  const groupBy = jest.fn().mockResolvedValue([]);
  const prisma = { budgetItem: { groupBy } } as never;
  const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
  const svc = new ProjectAnalyticsService(prisma, cache);
  await svc.costComposition({});
  expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PUBLISHED' }) }));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: FAIL — where has no `status`.

- [ ] **Step 3: Implement**

Add `status: 'PUBLISHED'` to the `where` in `costComposition`'s `budgetItem.groupBy` and in `projectCostSummary`'s budget `budgetItem.groupBy`. Leave the vendor/client invoice aggregations unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/application/services/project-analytics.service.ts apps/api/src/modules/analytics/application/services/analytics.service.spec.ts
git commit -m "fix(analytics): budget metric uses PUBLISHED consistently"
```

---

### Task 7: Frontend API hooks

**Files:**
- Modify: `apps/web/src/features/analytics/model/analytics.api.ts`
- Test: `apps/web/src/features/analytics/model/analytics.api.test.ts`

**Interfaces:**
- Consumes: `trendSeriesSchema`, `decompositionSchema` (Task 4); `getJson`, `filterQuery`, `DashboardFilter`.
- Produces: `useTrendSeries(input: { metric: string; bucket?: 'month'|'quarter'; compare?: 'previous' } & DashboardFilter)`; `useDecomposition(input: { metric: string; dimension: string; limit?: number; compare?: 'previous' } & DashboardFilter)`.

- [ ] **Step 1: Write the failing test**

```ts
// analytics.api.test.ts
import { analyticsKeys } from './analytics.api';

it('trendSeries query key includes metric, bucket and filter', () => {
  expect(analyticsKeys.trendSeries({ metric: 'cashIn', bucket: 'month' }, { legalEntityId: 'LE1' }))
    .toEqual(['analytics-trend-series', { metric: 'cashIn', bucket: 'month' }, { legalEntityId: 'LE1' }]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- analytics.api`
Expected: FAIL — `analyticsKeys.trendSeries` undefined.

- [ ] **Step 3: Implement**

Add `trendSeries`/`decomposition` to `analyticsKeys`, and two `useQuery` hooks that build the URL with `filterQuery` (extend `filterQuery` to accept `metric`/`dimension`/`bucket`/`limit`/`compare`) and `.parse()` with the new schemas. Follow the existing `useCashFlow` shape.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- analytics.api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/analytics/model/analytics.api.ts apps/web/src/features/analytics/model/analytics.api.test.ts
git commit -m "feat(analytics-web): useTrendSeries & useDecomposition hooks"
```

---

### Task 8: `scope-bar.tsx` (Zona 0)

**Files:**
- Create: `apps/web/src/features/analytics/ui/scope-bar.tsx`
- Modify: `apps/web/src/features/analytics/ui/index.ts` (export)
- Test: `apps/web/src/features/analytics/ui/scope-bar.test.tsx`

**Interfaces:**
- Consumes: `useDashboardFilter` (`@/widgets/dashboard-filter-bar`), `useUrlFilter`, `SegmentedControl`, `EntitySelect`, `FilterChip`, `Button` (`@aec/ui`).
- Produces: `ScopeBar` — renders period segmented control, entity select, a `Compare vs previous` toggle (URL `compare`), and active-filter chips. Also exports `useAnalyticsScope(): { filter: DashboardFilter; metric: string; setMetric; dimension: string; setDimension; compare: boolean; setCompare }` reading/writing URL via `useUrlFilter`.

- [ ] **Step 1: Write the failing test**

```tsx
// scope-bar.test.tsx
import { render, screen } from '@testing-library/react';
import { ScopeBarView } from './scope-bar';

it('renders period, entity, compare toggle and active chips', () => {
  render(<ScopeBarView preset="YTD" onPresetChange={() => {}} entityId="LE1" onEntityChange={() => {}}
    entities={[{ value: 'LE1', label: 'LE1 · Alpha' }]} compare onCompareChange={() => {}}
    chips={[{ key: 'entity', label: 'Entity: LE1' }]} onClearChip={() => {}} />);
  expect(screen.getByRole('radiogroup', { name: /period/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /compare vs previous/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Entity: LE1')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- scope-bar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Split into a presentational `ScopeBarView` (props above) and a connected `ScopeBar` using `useAnalyticsScope`. Reuse `SegmentedControl` for the period (options MTD/QTD/YTD/12M) and `EntitySelect` for the entity — do not re-implement them.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- scope-bar`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/analytics/ui/scope-bar.* apps/web/src/features/analytics/ui/index.ts
git commit -m "feat(analytics-web): scope bar (Zona 0)"
```

---

### Task 9: `trend-explorer.tsx` (Zona 1)

**Files:**
- Create: `apps/web/src/features/analytics/ui/trend-explorer.tsx`
- Modify: `apps/web/src/features/analytics/ui/index.ts`
- Test: `apps/web/src/features/analytics/ui/trend-explorer.test.tsx`

**Interfaces:**
- Consumes: `useTrendSeries` (Task 7), `DeltaBadge`, `SegmentedControl`, `EmptyState`, `ErrorState`, `Skeleton`, `ChartSkeleton` (`@aec/ui`); `CHART` (`@/widgets/dashboard-charts`); `formatIdr`/`formatIdrAxis`.
- Produces: `TrendExplorer({ metric, onMetricChange, filter, compare })` — a metric picker (SegmentedControl), the period value + `DeltaBadge`, and a recharts `LineChart` with the current series (solid, `CHART.strong`) and, when `compare`, the previous series (dashed, `CHART.axis`) sharing the x-axis.

- [ ] **Step 1: Write the failing test**

```tsx
// trend-explorer.test.tsx
import { render, screen } from '@testing-library/react';
import { TrendExplorerView } from './trend-explorer';

it('shows the period total, delta and an accessible chart with a text partner', () => {
  render(<TrendExplorerView metric="cashIn" onMetricChange={() => {}}
    data={{ metric: 'cashIn', unit: 'idr', bucket: 'month',
      points: [{ period: '2026-01', value: 100 }, { period: '2026-02', value: 0 }],
      total: 100, comparePoints: [{ period: '2026-01', value: 50 }, { period: '2026-02', value: 0 }],
      delta: { current: 100, previous: 50, pctChange: 100, direction: 'up' }, generatedAt: 'x' }} />);
  expect(screen.getByRole('img', { name: /cash in/i })).toBeInTheDocument();
  expect(screen.getByText(/100%/)).toBeInTheDocument();
});

it('shows an error affordance and never a number on failure', () => {
  render(<TrendExplorerView metric="cashIn" onMetricChange={() => {}} isError onRetry={() => {}} />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- trend-explorer`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`TrendExplorerView` handles loading (chart skeleton), error (`role="alert"` + retry), empty (`EmptyState`), and ready. Ready renders the metric picker, the total with `DeltaBadge`, and the chart wrapped in a `figure` with `role="img"` + `aria-label` describing the metric and range, plus an adjacent text summary (total + delta). Do not start the y-axis above 0.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- trend-explorer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/analytics/ui/trend-explorer.* apps/web/src/features/analytics/ui/index.ts
git commit -m "feat(analytics-web): trend explorer (Zona 1)"
```

---

### Task 10: `decomposition-bars.tsx` (Zona 2)

**Files:**
- Create: `apps/web/src/features/analytics/ui/decomposition-bars.tsx`
- Modify: `apps/web/src/features/analytics/ui/index.ts`
- Test: `apps/web/src/features/analytics/ui/decomposition-bars.test.tsx`

**Interfaces:**
- Consumes: `useDecomposition` (Task 7), `SegmentedControl`, `EmptyState`, `ErrorState`, `ChartSkeleton` (`@aec/ui`); `CHART`; `formatIdr`.
- Produces: `DecompositionBars({ metric, dimension, onDimensionChange, filter, compare })` — a dimension picker (entity/project/costType/client, filtered by the metric's allowed set), a diverging horizontal bar per contributor (positive → `CHART.positive`, negative → `CHART.negative`) with a text table beside/below it, an `others` row, and a drill-through link per item (project → `/project-health?project=`; client → `/finance/client-invoices`).

- [ ] **Step 1: Write the failing test**

```tsx
// decomposition-bars.test.tsx
import { render, screen } from '@testing-library/react';
import { DecompositionBarsView } from './decomposition-bars';

it('renders a text table that reconciles items and others', () => {
  render(<DecompositionBarsView metric="cashIn" dimension="client" onDimensionChange={() => {}}
    data={{ metric: 'cashIn', dimension: 'client',
      items: [{ key: 'a', label: 'Acme', value: 80, share: 0.7 }],
      total: 115, others: { value: 15 }, generatedAt: 'x' }} />);
  const table = screen.getByRole('table', { name: /contribution/i });
  expect(table).toBeInTheDocument();
  expect(screen.getByText(/others/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- decomposition-bars`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`DecompositionBarsView` handles loading/error/empty/ready. Ready renders the dimension `SegmentedControl` (options limited by `allowedDimensionsFor(metric)` — a small exported map mirroring Task 1), the bars, and a `<table aria-label="Contribution by <dimension>">` with columns Contributor / Value / Share / Δ. Bars are non-colour-dependent because the table repeats the values.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- decomposition-bars`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/analytics/ui/decomposition-bars.* apps/web/src/features/analytics/ui/index.ts
git commit -m "feat(analytics-web): decomposition bars (Zona 2)"
```

---

### Task 11: `rankings-table.tsx` (Zona 3)

**Files:**
- Create: `apps/web/src/features/analytics/ui/rankings-table.tsx`
- Modify: `apps/web/src/features/analytics/ui/index.ts`
- Test: `apps/web/src/features/analytics/ui/rankings-table.test.tsx`

**Interfaces:**
- Consumes: `useDecomposition` (Task 7), `DataGrid` (`@aec/ui`), `Sparkline` (`@aec/ui`), `formatIdr`.
- Produces: `RankingsTable({ metric, dimension, filter, compare, title })` — a dense `DataGrid` of top contributors with columns Rank / Contributor / Value / Δ / Share, drill-through on row click (focusable), and a horizontal bar as the value encoding.

- [ ] **Step 1: Write the failing test**

```tsx
// rankings-table.test.tsx
import { render, screen } from '@testing-library/react';
import { RankingsTableView } from './rankings-table';

it('renders one row per contributor with a drill-through row', () => {
  render(<RankingsTableView title="Top clients" dimension="client"
    data={{ metric: 'cashIn', dimension: 'client',
      items: [{ key: 'a', label: 'Acme', value: 80, share: 0.7 }],
      total: 115, others: { value: 15 }, generatedAt: 'x' }} />);
  expect(screen.getByText('Acme')).toBeInTheDocument();
  expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- rankings-table`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`RankingsTableView` maps `data.items` to `DataGrid` rows. Reuse `DataGrid`'s existing focusable-row drill-through (already keyboard-operable per FINDINGS F15) rather than a new table. Money columns `font-mono tabular-nums`, right-aligned.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- rankings-table`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/analytics/ui/rankings-table.* apps/web/src/features/analytics/ui/index.ts
git commit -m "feat(analytics-web): rankings table (Zona 3)"
```

---

### Task 12: `distributions.tsx` (Zona 4)

**Files:**
- Create: `apps/web/src/features/analytics/ui/distributions.tsx`
- Modify: `apps/web/src/features/analytics/ui/index.ts`
- Test: `apps/web/src/features/analytics/ui/distributions.test.tsx`

**Interfaces:**
- Consumes: existing hooks `useCostComposition`, `useAging`, `useArConcentration`, `useForecastVsActual` (Task 7 file, already present); `CostCompositionChart`, `AgingStackedBar`, `ConcentrationBars`, `ForecastVsActualChart` (`@/widgets/dashboard-charts`); `PanelState` (`@/features/analytics/ui/report-panel`).
- Produces: `Distributions({ filter })` — a responsive small-multiples grid of four panels, each wrapped in `PanelState` (loading/error/empty/ready).

- [ ] **Step 1: Write the failing test**

```tsx
// distributions.test.tsx
import { render, screen } from '@testing-library/react';
import { Distributions } from './distributions';

vi.mock('@/features/analytics/model/analytics.api', () => ({
  useCostComposition: () => ({ data: { items: [], total: 0, generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useAging: () => ({ data: { ar: [], ap: [], asOf: 'x', basisDate: 'invoiceDate', generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useArConcentration: () => ({ data: { items: [], total: 0, generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
  useForecastVsActual: () => ({ data: { periods: [], generatedAt: 'x' }, isLoading: false, isError: false, refetch: () => {} }),
}));

it('renders four distribution panels', () => {
  render(<Distributions filter={{}} />);
  expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- distributions`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Four panels in a `grid-cols-1 xl:grid-cols-2`: Cost composition, Aging AR/AP, AR concentration, Forecast vs actual. Each uses `PanelState` so a failing fetch shows `role="alert"`, never a fabricated zero.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- distributions`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/analytics/ui/distributions.* apps/web/src/features/analytics/ui/index.ts
git commit -m "feat(analytics-web): distributions small-multiples (Zona 4)"
```

---

### Task 13: Rebuild the page and remove duplication

**Files:**
- Modify: `apps/web/src/pages/analytics/analytics-dashboard.page.tsx` (rewrite to 5 zones)
- Modify: `apps/web/src/pages/analytics/analytics-dashboard.page.test.tsx`
- Delete: the anomaly-triage rendering from this page (keep `AnomalyTriageFilterable` in `ui/dashboard-ledger.tsx` only if still used elsewhere; otherwise remove it and its export)

**Interfaces:**
- Consumes: `ScopeBar` + `useAnalyticsScope` (Task 8), `TrendExplorer` (Task 9), `DecompositionBars` (Task 10), `RankingsTable` (Task 11), `Distributions` (Task 12).

- [ ] **Step 1: Write the failing test**

```tsx
// analytics-dashboard.page.test.tsx (assert structure, mock the zone components)
import { render, screen } from '@testing-library/react';

vi.mock('@/features/analytics/ui/scope-bar', () => ({ ScopeBar: () => <div data-testid="scope-bar" />, useAnalyticsScope: () => ({ filter: {}, metric: 'cashIn', setMetric: () => {}, dimension: 'client', setDimension: () => {}, compare: false, setCompare: () => {} }) }));
vi.mock('@/features/analytics/ui/trend-explorer', () => ({ TrendExplorer: () => <div data-testid="trend-explorer" /> }));
vi.mock('@/features/analytics/ui/decomposition-bars', () => ({ DecompositionBars: () => <div data-testid="decomposition-bars" /> }));
vi.mock('@/features/analytics/ui/rankings-table', () => ({ RankingsTable: () => <div data-testid="rankings-table" /> }));
vi.mock('@/features/analytics/ui/distributions', () => ({ Distributions: () => <div data-testid="distributions" /> }));

it('renders the five zones and no anomaly triage', () => {
  render(<AnalyticsDashboardPage />);
  ['scope-bar', 'trend-explorer', 'decomposition-bars', 'rankings-table', 'distributions']
    .forEach((id) => expect(screen.getByTestId(id)).toBeInTheDocument());
  expect(screen.queryByText(/anomaly triage/i)).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @aec/web test -- analytics-dashboard.page`
Expected: FAIL — testids missing / anomaly triage still present.

- [ ] **Step 3: Implement the page**

Rewrite `AnalyticsDashboardPage` to render, in order: `<ScopeBar/>`, `<TrendExplorer/>` (Zona 1), `<DecompositionBars/>` (Zona 2), `<RankingsTable/>` (Zona 3), `<Distributions/>` (Zona 4). Remove the old champion section, `LedgerSection` usage, `PortfolioHealthBar`, and `AnomalyTriageFilterable`. Keep `max-w-[1400px]`, the `<h1>` "Executive dashboard", and a scope-aware subtitle. Wire `useAnalyticsScope` so Zona 2's selection feeds Zona 3 (cross-filter). If `AnomalyTriageFilterable` has no other consumer, delete it and its export from `ui/dashboard-ledger.tsx`; if `LedgerSection`/`MetricRow` become unused, remove them too.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @aec/web test -- analytics-dashboard.page`
Expected: PASS.

- [ ] **Step 5: Run the full gate**

Run: `pnpm --filter @aec/api test:unit && pnpm --filter @aec/web test && pnpm lint && pnpm typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/analytics apps/web/src/features/analytics
git commit -m "feat(analytics-web): rebuild /analytics as the analytical workspace"
```

---

## Self-Review

**1. Spec coverage:**
- §4 five zones → Tasks 8–13. ✅
- §5.1 metric definitions → Task 1 (registry) + Task 6 (PUBLISHED alignment). ✅
- §5.2 two endpoints → Tasks 2, 3, 5. ✅
- §5.3 metric × dimension matrix → Task 1 (`allowedDimensions`) + Task 5 (400 on unsupported). ✅
- §5.4 reuse existing endpoints → Task 12 (distributions). ✅
- §5.5 additive + cache key → Tasks 2, 3 (key includes metric/dimension). ✅
- §6.1 visual selection → Tasks 9 (line), 10 (diverging), 11 (ranking), 12 (stacked). ✅
- §6.3 anti-slop (token-only) → Global Constraints + Task 9–12 import `chart-colors`. ✅
- §6.4 data states → every `*View`/`PanelState` task asserts loading/error/empty. ✅
- §6.5 drill-through / cross-filter → Tasks 10, 11, 13. ✅
- §7 architecture → Tasks 1–3, 7–12. ✅
- §8 error handling → Task 1 (`UNSUPPORTED_DECOMPOSITION`), Task 5 (`UNSUPPORTED_METRIC`), §6.4 FE. ✅
- §9 testing → each task’s test steps + Task 13 full gate. ✅
- §10 PR split → PR1 = Tasks 1–6; PR2 = Tasks 7–9; PR3 = Tasks 10–12; PR4 = Task 13. ✅

**2. Step scan:** every step names a file, an exact command, or a concrete assertion. No "handle edge cases" or "add tests" filler. ✅

**3. Type consistency:** `MetricKey`/`DimensionKey`/`MetricRow`/`ResolvedFilter` defined once (Task 1) and reused; `TrendSeries`/`Decomposition` types (Task 4) match the service return shapes (Tasks 2, 3) and the FE props (Tasks 9–11); hook names `useTrendSeries`/`useDecomposition` consistent across Tasks 7–12. ✅

**4. Review Focus:** RF1 → Task 2 Step 5 (empty periods = 0); RF2 → Task 2 Step 5 (comparePoints zeros); RF3 → Task 3 Step 1 (reconciliation); RF4 → Task 1 Step 1 + Task 5 Step 3 (400); RF5 → Task 1 Step 1 (`netCash` signed rows) + Task 3 (grouping). ✅

**5. Proportion:** plan is signature-and-assertion oriented; bodies appear only where an algorithm is not determined (bucketing, top-N + others). ✅
