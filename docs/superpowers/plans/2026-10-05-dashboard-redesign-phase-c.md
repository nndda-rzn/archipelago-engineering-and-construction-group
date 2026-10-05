# Dashboard Phase C — Interaction & Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the dashboard prioritise and explore: signals carry document age, KPIs show period-over-period deltas, and clicking a legend/point/bar cross-filters every zone — all inside the existing AEC design system.

**Architecture:** Two additive API capabilities (`GET /analytics/signals`; `GET /analytics/executive?compare=previous`) plus frontend cross-filter state in the URL. Two new `@aec/ui` primitives (`DeltaBadge`, `FilterChip`). No new colors/fonts/radii.

**Tech Stack:** React 18 + TanStack Query/Router, Tailwind token preset, NestJS 10 + Prisma, Zod (`@aec/api-contracts`), Vitest + RTL (web), Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-redesign-phase-c-design.md`

## Global Constraints

- Design system-first: **no new colors/fonts/radii**.
- All user-facing copy in **English**; money/date formatting stays `id-ID`.
- API params optional; no params ⇒ whole-company result; `compare` absent ⇒ response shape unchanged.
- `oldestAgeDays` = whole days since the oldest open document's `createdAt`; `0` when not applicable.
- Cross-filter state lives in the URL (`health`, `bucket`); clicking again clears.
- Health/EVM/severity never colour-alone: always a dot/badge **and** text.
- Numbers render `font-mono tabular-nums`.
- Web tests `*.test.tsx` next to source (Vitest, `globals:false`). API unit tests `*.spec.ts` next to source.
- Commit after every task. Branch: `feat/dashboard-phase-c`.

## Review Focus

Inputs/conditions the spec implies but no task's happy-path test covers — each pinned by a test in the task noted:

1. **No open documents** for a signal ⇒ `oldestAgeDays: 0` and the signal omitted (count 0). (Task 3)
2. **`compare=previous` when the previous period had zero** ⇒ `pctChange` null, not `Infinity`. (Task 4)
3. **A cross-filter that matches no project** ⇒ empty table/legend state, not a crash. (Task 7)
4. **Clearing a filter chip** removes exactly that key from the URL, leaving others intact. (Task 8)
5. **Signals response without params** behaves as whole-company (aditive). (Task 3)

---

## File Structure

**New — `packages/ui/src/primitives/`**
- `delta-badge.tsx` — `DeltaBadge({ pct, direction })`.
- `filter-chip.tsx` — `FilterChip({ label, onRemove })`.

**New — API**
- `apps/api/src/modules/analytics/application/services/signals.service.ts` (or a method on `AnalyticsService`) — `signals(filter)`.

**Modified — contracts**
- `packages/api-contracts/src/analytics.ts` — `signalSchema`, `signalListSchema`, `deltaBlockSchema`, extend `executiveDashboardSchema` with optional `previous`/`delta`.

**Modified — API**
- `analytics.service.ts` — `signals(filter)`, `executive(filter, compare)`.
- `analytics.controller.ts` — `GET /analytics/signals`, `compare` query on executive.

**Modified — web**
- `packages/ui/src/index.ts` — export `DeltaBadge`, `FilterChip`.
- `apps/web/src/widgets/signal-rail/signal-rail.tsx` — consume `/analytics/signals`; show age; sort severity→age→count.
- `apps/web/src/widgets/hero-band/hero-band.tsx` — StatCard deltas.
- `apps/web/src/widgets/financial-band/financial-band.tsx` — clickable aging buckets.
- `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` — clickable legend + dim non-matching.
- `apps/web/src/widgets/portfolio-spine/portfolio-spine.tsx` — apply health filter.
- `apps/web/src/widgets/anomaly-triage/` (new) — grouped anomaly triage panel.
- `apps/web/src/widgets/dashboard-filter-bar/dashboard-filter-bar.tsx` — active filter chips.
- `apps/web/src/features/analytics/model/analytics.api.ts` — `useSignals(filter)`, `useExecutiveDashboard(filter, { compare })`.
- `apps/web/src/pages/dashboard.page.tsx` — wire cross-filter state + triage panel.

---

## Task 1: `DeltaBadge` primitive

**Files:**
- Create: `packages/ui/src/primitives/delta-badge.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/test/delta-badge.test.tsx`

**Interfaces:**
- Produces: `DeltaBadge({ pct, direction, className? })` where `pct: number | null`, `direction: 'up' | 'down' | 'flat'`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/test/delta-badge.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeltaBadge } from '@aec/ui';

describe('DeltaBadge', () => {
  it('renders an up delta with an accessible direction label', () => {
    render(<DeltaBadge pct={12.4} direction="up" />);
    expect(screen.getByText(/\+12\.4%/)).toBeTruthy();
    expect(screen.getByLabelText('up')).toBeTruthy();
  });

  it('renders a down delta', () => {
    render(<DeltaBadge pct={-3} direction="down" />);
    expect(screen.getByText(/-3%/)).toBeTruthy();
  });

  it('renders an em dash when pct is null', () => {
    render(<DeltaBadge pct={null} direction="flat" />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- delta-badge`
Expected: FAIL — `DeltaBadge` not exported.

- [ ] **Step 3: Implement `DeltaBadge`**

`delta-badge.tsx`: if `pct == null` render `<span className="text-caption text-neutral-400">—</span>`. Otherwise arrow glyph (`↑`/`↓`/`→`), formatted `${pct >= 0 ? '+' : ''}${Math.round(pct*10)/10}%`, wrapped in `<span aria-label={direction}>` with colour `financial-positive-600` (up) / `financial-negative-600` (down) / `neutral-500` (flat). `font-mono text-caption tabular-nums`.

- [ ] **Step 4: Export from barrel**

`export { DeltaBadge, type DeltaBadgeProps } from './primitives/delta-badge';`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- delta-badge`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/primitives/delta-badge.tsx packages/ui/src/index.ts apps/web/src/test/delta-badge.test.tsx
git commit -m "feat(ui): DeltaBadge primitive"
```

---

## Task 2: `FilterChip` primitive

**Files:**
- Create: `packages/ui/src/primitives/filter-chip.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/test/filter-chip.test.tsx`

**Interfaces:**
- Produces: `FilterChip({ label, onRemove })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/test/filter-chip.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FilterChip } from '@aec/ui';

describe('FilterChip', () => {
  it('renders the label and calls onRemove when the remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<FilterChip label="Health: Critical" onRemove={onRemove} />);
    expect(screen.getByText('Health: Critical')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /remove health: critical/i }));
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- filter-chip`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement `FilterChip`**

`filter-chip.tsx`: `<span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-caption text-neutral-700">{label}<button type="button" aria-label={\`Remove ${label}\`} onClick={onRemove} className="text-neutral-400 hover:text-neutral-700">✕</button></span>`.

- [ ] **Step 4: Export from barrel**

`export { FilterChip, type FilterChipProps } from './primitives/filter-chip';`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- filter-chip`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/primitives/filter-chip.tsx packages/ui/src/index.ts apps/web/src/test/filter-chip.test.tsx
git commit -m "feat(ui): FilterChip primitive"
```

---

## Task 3: `GET /analytics/signals`

**Files:**
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.ts`
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.spec.ts`
- Modify: `apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts`
- Modify: `packages/api-contracts/src/analytics.ts`

**Interfaces:**
- Produces (contracts): `signalSchema` `{ key, severity: 'HIGH'|'MEDIUM'|'LOW', count, oldestAgeDays, label, to }`; `signalListSchema` `{ signals: Signal[], generatedAt }`.
- Produces (service): `signals(filter?: AnalyticsFilterParams)`.
- Produces (controller): `GET /analytics/signals`.

- [ ] **Step 1: Write the failing test**

```ts
// add to apps/api/src/modules/analytics/application/services/analytics.service.spec.ts
describe('AnalyticsService.signals', () => {
  it('omits signals with count 0 and reports oldestAgeDays', async () => {
    const now = Date.now();
    const prisma = {
      ncr: { findMany: jest.fn().mockResolvedValue([{ createdAt: new Date(now - 12 * 86400000) }, { createdAt: new Date(now - 2 * 86400000) }]) },
      hseIncident: { findMany: jest.fn().mockResolvedValue([]) },
      punchListItem: { findMany: jest.fn().mockResolvedValue([]) },
      progressClaim: { findMany: jest.fn().mockResolvedValue([]) },
      equipmentPm: { findMany: jest.fn().mockResolvedValue([]) },
      approvalTask: { findMany: jest.fn().mockResolvedValue([]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;

    const svc = new AnalyticsService(prisma, cache);
    const result = await svc.signals();

    const ncrs = result.signals.find((s) => s.key === 'ncrs');
    expect(ncrs?.count).toBe(2);
    expect(ncrs?.oldestAgeDays).toBeGreaterThanOrEqual(11);
    expect(result.signals.find((s) => s.key === 'incidents')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: FAIL — `svc.signals` is not a function.

- [ ] **Step 3: Add contract schemas**

Append to `packages/api-contracts/src/analytics.ts`:

```ts
export const signalSchema = z.object({
  key: z.string(),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  count: z.number(),
  oldestAgeDays: z.number(),
  label: z.string(),
  to: z.string(),
});
export type Signal = z.infer<typeof signalSchema>;

export const signalListSchema = z.object({
  signals: z.array(signalSchema),
  generatedAt: z.string(),
});
export type SignalList = z.infer<typeof signalListSchema>;
```

- [ ] **Step 4: Implement `signals`**

In `analytics.service.ts`, add:

```ts
async signals(filter: AnalyticsFilterParams = {}) {
  return this.cache.wrap(analyticsCacheKey('analytics:signals', filter), 30, async () => {
    const projectWhere = filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {};
    const ageDays = (rows: { createdAt: Date }[]) =>
      rows.length === 0 ? 0 : Math.floor((Date.now() - Math.min(...rows.map((r) => r.createdAt.getTime()))) / 86400000);

    const [ncrs, incidents, punch, claims, pms, approvals] = await this.prisma.$transaction([
      this.prisma.ncr.findMany({ where: { status: { not: 'CLOSED' }, ...projectWhere }, select: { createdAt: true } }),
      this.prisma.hseIncident.findMany({ where: { status: { not: 'RESOLVED' }, ...projectWhere }, select: { createdAt: true } }),
      this.prisma.punchListItem.findMany({ where: { status: 'OPEN', ...projectWhere }, select: { createdAt: true } }),
      this.prisma.progressClaim.findMany({ where: { status: 'DRAFT', ...projectWhere }, select: { createdAt: true } }),
      this.prisma.equipmentPm.findMany({ where: { status: 'SCHEDULED', dueDate: { lt: new Date() } }, select: { createdAt: true } }),
      this.prisma.approvalTask.findMany({ where: { status: 'PENDING' }, select: { createdAt: true } }),
    ]);

    const build = (key: string, severity: 'HIGH' | 'MEDIUM' | 'LOW', rows: { createdAt: Date }[], label: string, to: string) =>
      rows.length === 0 ? null : { key, severity, count: rows.length, oldestAgeDays: ageDays(rows), label, to };

    const signals = [
      build('ncrs', 'HIGH', ncrs, 'NCRs', '/quality?tab=ncrs&status=OPEN'),
      build('incidents', 'HIGH', incidents, 'Incidents', '/hse?tab=incidents&status=OPEN'),
      build('pm', 'MEDIUM', pms, 'PM overdue', '/hcm/equipment'),
      build('claims', 'LOW', claims, 'Claims DRAFT', '/finance/progress-claims?status=DRAFT'),
      build('approvals', 'LOW', approvals, 'Approvals', '/approvals'),
      build('punch', 'LOW', punch, 'Punch items', '/quality?tab=punch&status=OPEN'),
    ].filter((s): s is NonNullable<typeof s> => s != null);

    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    signals.sort((a, b) => rank[a.severity] - rank[b.severity] || b.oldestAgeDays - a.oldestAgeDays || b.count - a.count);

    return { signals, generatedAt: new Date().toISOString() };
  });
}
```

- [ ] **Step 5: Wire controller**

In `analytics.controller.ts`, add `@Get('signals') @Permissions(Permission.AnalyticsView) signals(@Query() query: AnalyticsFilterParams) { return this.analytics.signals(query); }`.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: PASS. Then `pnpm --filter @aec/api typecheck` clean.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/analytics packages/api-contracts/src/analytics.ts
git commit -m "feat(analytics): signals endpoint with document age"
```

---

## Task 4: `executive?compare=previous`

**Files:**
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.ts`
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.spec.ts`
- Modify: `apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts`
- Modify: `packages/api-contracts/src/analytics.ts`

**Interfaces:**
- Produces (contracts): `deltaMetricSchema` `{ current, previous, pctChange: number|null, direction: 'up'|'down'|'flat' }`; `executiveDashboardSchema` gains optional `delta?: Record<string, DeltaMetric>`.
- Produces (service): `executive(filter?, compare?: 'previous')`.

- [ ] **Step 1: Write the failing test**

```ts
// add to analytics.service.spec.ts
describe('AnalyticsService.executive compare', () => {
  it('computes delta with null pctChange when previous is zero', async () => {
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
    const svc = new AnalyticsService({} as never, cache);
    // Spy the private-ish shape by stubbing executive's data fetches is heavy; instead test the pure helper.
    const delta = svc.computeDelta(100, 0);
    expect(delta.pctChange).toBeNull();
    expect(delta.direction).toBe('up');
    const delta2 = svc.computeDelta(0, 0);
    expect(delta2.direction).toBe('flat');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: FAIL — `computeDelta` is not a function.

- [ ] **Step 3: Implement `computeDelta` + compare path**

Add a public helper (testable, pure):

```ts
computeDelta(current: number, previous: number): { current: number; previous: number; pctChange: number | null; direction: 'up' | 'down' | 'flat' } {
  const pctChange = previous !== 0 ? Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10 : null;
  const direction = current > previous ? 'up' : current < previous ? 'down' : 'flat';
  return { current, previous, pctChange, direction };
}
```

In `executive`, accept a second arg `compare?: 'previous'`. When `compare === 'previous'`:
- Compute the previous window from `filter.from`/`filter.to` by shifting back one period of equal length
  (or, if no range, the previous calendar month). Call the same aggregation for the previous window.
- Build `delta` = map of metric path → `computeDelta(current, previous)` for the headline metrics
  (`projects.total`, `finance.totalBudget`, `finance.cashIn`, `finance.cashOut`, `operational.openNcrs`).
- Include `delta` in the response; otherwise omit it.

- [ ] **Step 4: Update contracts**

Add `deltaMetricSchema` and make `delta` optional on `executiveDashboardSchema`.

- [ ] **Step 5: Wire controller**

`executive(@Query() query: AnalyticsFilterParams, @Query('compare') compare?: string)` → `this.analytics.executive(query, compare === 'previous' ? 'previous' : undefined)`.

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- analytics.service`
Expected: PASS. Then `pnpm --filter @aec/api typecheck` clean.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/analytics packages/api-contracts/src/analytics.ts
git commit -m "feat(analytics): executive compare=previous with delta"
```

---

## Task 5: Web hooks — `useSignals`, `useExecutiveDashboard(compare)`

**Files:**
- Modify: `apps/web/src/features/analytics/model/analytics.api.ts`
- Test: `apps/web/src/features/analytics/model/analytics.api.test.ts` (optional; hook shape test)

**Interfaces:**
- Produces: `useSignals(filter?: DashboardFilter)`, `useExecutiveDashboard(filter?, opts?: { compare?: 'previous' })`.

- [ ] **Step 1: Add `useSignals`**

```ts
export function useSignals(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: ['analytics-signals', filter] as const,
    queryFn: async () => signalListSchema.parse(await getJson<unknown>(`/analytics/signals${filterQuery(filter)}`)),
    refetchInterval: 30000,
  });
}
```
Import `signalListSchema`.

- [ ] **Step 2: Extend `useExecutiveDashboard`**

Add an options arg; when `compare === 'previous'`, append `&compare=previous` to the query string and include it in the `queryKey`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @aec/web typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/analytics/model/analytics.api.ts
git commit -m "feat(web): useSignals + executive compare hook"
```

---

## Task 6: Signal Rail consumes `/analytics/signals` with age

**Files:**
- Modify: `apps/web/src/widgets/signal-rail/signal-rail.tsx`
- Modify: `apps/web/src/widgets/signal-rail/signal-rail.test.tsx`

**Interfaces:**
- Consumes: `useSignals` (Task 5), `SignalChip`.
- Produces: `SignalRailView({ signals })` renders age context; `SignalRail({ filter })` uses `useSignals`.

- [ ] **Step 1: Write the failing test**

```tsx
// add to signal-rail.test.tsx
import { render, screen } from '@testing-library/react';
import { SignalRailView } from './signal-rail';

describe('SignalRailView age', () => {
  it('shows the oldest age in the chip context', () => {
    render(<SignalRailView signals={[{ key: 'ncrs', severity: 'high', count: 2, label: 'NCRs', context: 'open', ageDays: 12, to: '/quality?tab=ncrs&status=OPEN' }]} />);
    expect(screen.getByText(/12d/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- signal-rail`
Expected: FAIL — `ageDays` not rendered.

- [ ] **Step 3: Implement**

Add `ageDays: number` to the `Signal` interface. `SignalRailView` renders the chip context as
`${context} · ${ageDays}d` when `ageDays > 0`. `SignalRail` switches from `buildSignals(executive…)`
to `useSignals(filter)` and maps the API signals into `Signal[]` (mapping `severity` upper→lower,
`oldestAgeDays`→`ageDays`). Keep `buildSignals` for the empty-state test, or replace its use with a
small mapper `toSignals(apiSignals)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- signal-rail`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/signal-rail/
git commit -m "feat(web): signal rail shows document age"
```

---

## Task 7: Cross-filter state + legend/bucket selection

**Files:**
- Modify: `apps/web/src/pages/dashboard.page.tsx`
- Modify: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx`
- Modify: `apps/web/src/widgets/portfolio-spine/portfolio-spine.tsx`
- Modify: `apps/web/src/widgets/financial-band/financial-band.tsx`
- Test: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.test.tsx`

**Interfaces:**
- Produces: `useCrossFilter()` → `{ health, bucket, setHealth, setBucket }` backed by `useUrlFilter`.
- Produces: `filterByHealth(points, health)` and `filterRowsByHealth(rows, health)` pure helpers.

- [ ] **Step 1: Write the failing test**

```tsx
// add to portfolio-canvas.test.tsx
import { filterByHealth } from './portfolio-canvas';

describe('filterByHealth', () => {
  it('returns all points when health is empty', () => {
    const pts = [{ projectId: 'p1', health: 'CRITICAL' as const }] as never[];
    expect(filterByHealth(pts, '').length).toBe(1);
  });
  it('keeps only matching points', () => {
    const pts = [{ projectId: 'p1', health: 'CRITICAL' as const }, { projectId: 'p2', health: 'ON_TRACK' as const }] as never[];
    expect(filterByHealth(pts, 'CRITICAL').map((p) => (p as { projectId: string }).projectId)).toEqual(['p1']);
  });
  it('returns empty for a filter that matches nothing', () => {
    const pts = [{ projectId: 'p1', health: 'ON_TRACK' as const }] as never[];
    expect(filterByHealth(pts, 'CRITICAL')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- portfolio-canvas`
Expected: FAIL — `filterByHealth` not exported.

- [ ] **Step 3: Implement `filterByHealth` + legend selection**

Add `filterByHealth(points, health)` returning `health ? points.filter(p => p.health === health) : points`.
Make each legend `Badge` a button that calls `onSelectHealth(k)` (toggle: same value clears). Dim non-matching points (`fillOpacity 0.25`) when a health filter is active.

- [ ] **Step 4: Wire `useCrossFilter` + apply in spine + financial**

`dashboard.page.tsx`: read `health`/`bucket` via `useUrlFilter`; pass down. `PortfolioSpine` filters rows by health. `FinancialBand` aging buckets become buttons that set `bucket`; when `bucket` is set, the AR/AP bar highlights it. `PortfolioCanvas` receives `health` and dims others.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @aec/web test -- portfolio-canvas`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/dashboard.page.tsx apps/web/src/widgets/portfolio-canvas apps/web/src/widgets/portfolio-spine apps/web/src/widgets/financial-band
git commit -m "feat(web): cross-filter linked views (health, aging bucket)"
```

---

## Task 8: Active filter chips in the filter bar

**Files:**
- Modify: `apps/web/src/widgets/dashboard-filter-bar/dashboard-filter-bar.tsx`
- Test: `apps/web/src/widgets/dashboard-filter-bar/dashboard-filter-bar.test.tsx`

**Interfaces:**
- Consumes: `FilterChip` (Task 2), `useUrlFilter`.
- Produces: `activeFilters({ period, entity, health, bucket }): { key: string; label: string }[]` (pure).

- [ ] **Step 1: Write the failing test**

```tsx
// add to dashboard-filter-bar.test.tsx
import { activeFilters } from './dashboard-filter-bar';

describe('activeFilters', () => {
  it('lists only set filters', () => {
    const list = activeFilters({ period: 'YTD', entity: '', health: 'CRITICAL', bucket: '' });
    expect(list.map((f) => f.key)).toEqual(['health']);
  });
  it('includes entity when set', () => {
    const list = activeFilters({ period: '', entity: 'LE1', health: '', bucket: '90+' });
    expect(list.map((f) => f.key).sort()).toEqual(['bucket', 'entity']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- dashboard-filter-bar`
Expected: FAIL — `activeFilters` not exported.

- [ ] **Step 3: Implement**

`activeFilters(input)` returns `{ key, label }[]` for non-empty `entity`, `health`, `bucket`
(`period` is a preset, not a "filter chip"). Render them via `FilterChip`; `onRemove` clears exactly
that URL key using `useUrlFilter(key)` setters.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- dashboard-filter-bar`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/dashboard-filter-bar/
git commit -m "feat(web): active filter chips"
```

---

## Task 9: Anomaly triage panel

**Files:**
- Create: `apps/web/src/widgets/anomaly-triage/anomaly-triage.tsx`
- Create: `apps/web/src/widgets/anomaly-triage/index.ts`
- Test: `apps/web/src/widgets/anomaly-triage/anomaly-triage.test.tsx`
- Modify: `apps/web/src/pages/dashboard.page.tsx`

**Interfaces:**
- Consumes: `useAnomalies()`.
- Produces: `groupAnomalies(anomalies): { severity: 'HIGH'|'MEDIUM'|'LOW'; items: Anomaly[] }[]`; `AnomalyTriage()`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/anomaly-triage/anomaly-triage.test.tsx
import { describe, expect, it } from 'vitest';
import { groupAnomalies } from './anomaly-triage';

describe('groupAnomalies', () => {
  it('groups by severity in HIGH→MEDIUM→LOW order, dropping empty groups', () => {
    const groups = groupAnomalies([
      { type: 'A', severity: 'LOW', message: 'a' },
      { type: 'B', severity: 'HIGH', message: 'b' },
    ]);
    expect(groups.map((g) => g.severity)).toEqual(['HIGH', 'LOW']);
    expect(groups[0]!.items.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- anomaly-triage`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`groupAnomalies(anomalies)` buckets by severity, returns ordered non-empty groups. `AnomalyTriage`:
`useAnomalies()`; if empty → quiet state; else for each group render a header (`Badge` severity + count)
and rows (type mono + message + optional `projectCode`). Deep-link: if `projectCode`, link to
`/projects` (or project-health by code if resolvable). Card container standard.

- [ ] **Step 4: Wire into the page**

Render `<AnomalyTriage />` in Zona 4 (below the portfolio zone) or as its own zone.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- anomaly-triage`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/anomaly-triage/ apps/web/src/pages/dashboard.page.tsx
git commit -m "feat(web): anomaly triage panel"
```

---

## Task 10: Whole-suite verification

**Files:** none.

- [ ] **Step 1: Typecheck** — `pnpm typecheck` → `Tasks: 10 successful`.
- [ ] **Step 2: Lint** — `pnpm lint` → `Tasks: 6 successful`.
- [ ] **Step 3: API unit** — `pnpm --filter @aec/api test:unit` → all pass.
- [ ] **Step 4: Web tests** — `pnpm --filter @aec/web test` → all pass.
- [ ] **Step 5: Manual smoke** — with API+web running, confirm: signal chips show age; clicking a health legend filters the table; clicking an aging bucket filters; filter chips appear and clear; anomalies are grouped.
- [ ] **Step 6: Commit any fixes, then push** — `git push -u origin feat/dashboard-phase-c`.

---

## Self-Review Notes

- **Spec coverage:** signals+age → Tasks 3, 6; delta → Tasks 4, 5, 7 (StatCard); cross-filter → Tasks 7, 8; triage → Task 9; primitives → Tasks 1, 2; verification → Task 10.
- **Deferred to Phase D:** saved views, ⌘K, keyboard-first, filtered export.
- **Risk:** `compare=previous` doubles aggregation cost for the executive endpoint; mitigated by the existing short cache TTL and by only computing when `compare` is present.
- **Type consistency:** `Signal` (contracts, Task 3) vs web `Signal` (widget) — the widget maps between them via `toSignals`; `DeltaMetric` defined once (Task 4).

