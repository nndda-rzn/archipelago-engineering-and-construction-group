# Dashboard Polish + Analytical Density — Design & Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

> **AMENDMENT (Zona 0–4 UI/UX refinement).** This brief supersedes two earlier
> decisions in this plan:
> 1. **Selection colour reversal.** `SegmentedControl`'s selected segment is now
>    `bg-neutral-800`, **not** `bg-racing-red-600`. Red means attention/action,
>    never "selected". Applied primitive-wide (dashboard + every consumer). The
>    same rule now governs the aging bucket buttons (`financial-band`) and the
>    canvas health-legend active border.
> 2. **Zero is neutral.** Financial values of exactly `0` (cash on hand, net cash
>    flow, working-capital gap) render neutral (`text-neutral-950`), never green —
>    new helper `apps/web/src/shared/lib/value-tone.ts`.
>
> Additional zone work delivered in this amendment: scrollable Signal Rail with
> `oldest Nd`; `ChartSkeleton`/`ListSkeleton` shaped loaders; `EmptyState` gains
> `icon`/`tone`; educational Portfolio Canvas empty state (faint axes + crosshair
> + watermark + Indonesian copy); calm enterprise icons on the all-clear states;
> `AgingStackedBar` legend + `BudgetBullet` target marker. Tasks 5 and 7 below are
> now **done** (see commits). Remaining: Task 6 (ranking), 8–11 as scoped.

**Goal:** Turn the dashboard from "a table and some KPI cards" into a dense, analytical instrument panel: token-compliant charts, shaped loading skeletons, informative empty states, a balanced Z-pattern layout, and five purposeful new visualisations (cost composition, cash-flow area+trend, aging stacked bar, project ranking, budget bullet) — all inside the existing AEC design system.

**Architecture:** One additive API endpoint (`GET /analytics/cost-composition`). A shared `chart-colors.ts` sourced from design tokens replaces all hardcoded hex. New chart components live in `apps/web/src/widgets/dashboard-charts/`. Cards adopt the `Card` primitive. The demo seed is enriched so the dashboard has realistic data. No new colors/fonts/radii.

**Tech Stack:** React 18 + TanStack Query, recharts 3.10, Tailwind token preset, NestJS 10 + Prisma, Zod, Vitest + RTL, Jest.

**Design references:** Wikipedia *Dashboard (computing)* (citing Stephen Few 2006, Eckerson 2010, Presthus & Canales 2015) — visuals over tables; chart type matched to data; legends when >1 color; Z-pattern placement; colorblind-friendly restrained palette; avoid "data graveyard".

**Spec:** this document — the "Design (spec)" section below is the spec; the tasks are the plan.

## Global Constraints

- Design system-first: **no new colors/fonts/radii**. Chart colors come from `chart-colors.ts` which mirrors the token values.
- All user-facing copy in **English**; money/date formatting stays `id-ID`.
- Dashboard role: **analytical, dense but compact** — structure over volume; every visual has a purpose (no data graveyard).
- New API endpoint additive; no params ⇒ whole-company.
- Loading uses **shaped skeletons**, never a bare "Loading…" string.
- Empty states are informative (explain, don't just show "—").
- Numbers render `font-mono tabular-nums`; health/EVM never colour-alone.
- Web tests `*.test.tsx` next to source (Vitest, `globals:false`). API unit tests `*.spec.ts` next to source.
- Commit after every task. Branch: `feat/dashboard-polish`.

## Review Focus

1. **All-zero cost composition** must show an informative empty state, not a blank donut. (Task 3)
2. **Single-month cash flow** must still render the area chart without dividing by zero on the X scale. (Task 4)
3. **Empty aging** must show the message, not a zero-width stacked bar. (Task 5)
4. **Ranking with one project** must not break bar scaling (`Math.max` of one element). (Task 6)
5. **`budget = 0`** in the bullet graph must not produce a divide-by-zero width. (Task 7)

---

## Design (spec)

### Aesthetic direction
Refined/utilitarian instrument panel. Maximal data-ink, minimal chrome. One 40px champion figure per screen; everything else is `h2`/`h3`/caption. Racing-red only for action/selection; health colours only for health.

### Spatial system
12-column grid, `gap-4` within a zone, `gap-6` between zones. Z-pattern (most important top-left):
```
Z1 Signal strip
Z2 KPI strip (4 cards, one row)          ← NEW: separated from hero
Z3 Cash (7) ‖ Liquidity (5)
Z4 Cost composition ‖ Aging ‖ Burn (3 cols)   ← NEW
Z5 Portfolio: Canvas (7) ‖ Ranking (5)        ← NEW ranking panel
Z6 Anomaly triage
```

### Chart catalogue (data → chart, per Few)
| Zona | Chart | Source | Backend |
|---|---|---|---|
| Z3 | Area + trend line | `cashFlow.series` | ada |
| Z3 | Sparkline | `cashFlow.series` | ada |
| Z4 | Donut | `budgetItem` by `costType` | **+baru** |
| Z4 | Stacked bar | `aging.ar/ap` | ada |
| Z4 | Bullet graph | `portfolio.totals` | ada |
| Z5 | Scatter | portfolio + EVM | ada |
| Z5 | Horizontal bar | portfolio items | ada |

### API addition
`GET /analytics/cost-composition?legalEntityId=` →
`{ items: [{ costType: string, amount: number }], total: number, generatedAt: string }`

---

## File Structure

**New — `apps/web/src/widgets/dashboard-charts/`**
- `chart-colors.ts` — token-sourced colour constants.
- `cost-composition-chart.tsx` — donut.
- `cash-flow-area.tsx` — area + trend line.
- `aging-stacked-bar.tsx` — stacked horizontal bar.
- `project-ranking-bar.tsx` — horizontal variance bars.
- `budget-bullet.tsx` — bullet graph with target marker.

**New — `apps/api/src/modules/analytics/`**
- method `costComposition(filter)` on `AnalyticsService` + controller route.

**Modified**
- `packages/api-contracts/src/analytics.ts` — `costCompositionSchema`.
- `packages/ui/src/primitives/stat-card.tsx` — use `DeltaBadge` internally.
- `apps/web/src/features/analytics/model/analytics.api.ts` — `useCostComposition`.
- `apps/web/src/widgets/dashboard-charts/charts.tsx` — token colors; delete `HealthDonut`.
- `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` — token colors.
- `apps/web/src/widgets/signal-rail/signal-rail.tsx` — delete `buildSignals`.
- `apps/web/src/widgets/hero-band/hero-band.tsx` — split KPI into strip; keep champion figure.
- `apps/web/src/widgets/financial-band/financial-band.tsx` — Card + skeletons + new charts.
- `apps/web/src/widgets/liquidity-panel/liquidity-panel.tsx` — Card + skeleton.
- `apps/web/src/widgets/anomaly-triage/anomaly-triage.tsx` — Card + skeleton.
- `apps/web/src/pages/dashboard.page.tsx` — new zone layout; "Tabel"→"Table".
- `apps/api/prisma/seed-demo.ts` — richer demo data.

---

## Task 1: `chart-colors.ts` (token-sourced)

**Files:**
- Create: `apps/web/src/widgets/dashboard-charts/chart-colors.ts`
- Test: `apps/web/src/widgets/dashboard-charts/chart-colors.test.ts`

**Interfaces:**
- Produces: `CHART` (grid/axis/tooltip colours), `HEALTH_COLORS` (per health), `AGING_COLORS` (5 buckets), `COST_COLORS` (per costType).

- [ ] **Step 1: Write the failing test**

```ts
// chart-colors.test.ts
import { describe, expect, it } from 'vitest';
import { CHART, HEALTH_COLORS, AGING_COLORS, COST_COLORS } from './chart-colors';

describe('chart-colors', () => {
  it('uses the neutral-200 token for grid lines', () => {
    expect(CHART.grid).toBe('#e4e4e7');
  });
  it('maps every health key to the project-* tokens', () => {
    expect(HEALTH_COLORS.ON_TRACK).toBe('#22c55e');
    expect(HEALTH_COLORS.AT_RISK).toBe('#f59e0b');
    expect(HEALTH_COLORS.CRITICAL).toBe('#ef4444');
    expect(HEALTH_COLORS.NO_BUDGET).toBe('#a1a1aa');
  });
  it('has five aging colours', () => {
    expect(AGING_COLORS).toHaveLength(5);
  });
  it('covers every costType', () => {
    for (const k of ['DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD']) {
      expect(COST_COLORS[k]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- chart-colors`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Single source for chart colours, each annotated with the token it mirrors:
`CHART = { grid: '#e4e4e7', axis: '#71717a', positive: '#16a34a', negative: '#dc2626', accent: '#dc2626' }`;
`HEALTH_COLORS` = project-on-track/at-risk/critical-500 + neutral-400;
`AGING_COLORS = ['#22c55e','#a1a1aa','#f59e0b','#f97316','#ef4444']`;
`COST_COLORS` mapping the 7 `costType` values to a restrained set from the existing ramps (e.g. MATERIAL `#dc2626`, LABOR `#2563eb`, SUBCONTRACTOR `#f59e0b`, EQUIPMENT `#16a34a`, DIRECT `#71717a`, INDIRECT `#a1a1aa`, OVERHEAD `#52525b`).

- [ ] **Step 4: Run test to verify it passes** → PASS.

- [ ] **Step 5: Commit** `feat(web): token-sourced chart colors`

---

## Task 2: `GET /analytics/cost-composition`

**Files:**
- Modify: `packages/api-contracts/src/analytics.ts`
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.ts`
- Modify: `apps/api/src/modules/analytics/application/services/analytics.service.spec.ts`
- Modify: `apps/api/src/modules/analytics/presentation/controllers/analytics.controller.ts`

**Interfaces:**
- Produces (contracts): `costCompositionSchema` `{ items: { costType: string; amount: number }[]; total: number; generatedAt: string }`.
- Produces (service): `costComposition(filter?: AnalyticsFilterParams)`.
- Produces (controller): `GET /analytics/cost-composition`.

- [ ] **Step 1: Write the failing test**

```ts
// add to analytics.service.spec.ts
describe('AnalyticsService.costComposition', () => {
  it('groups published budget by costType and totals it', async () => {
    const prisma = {
      budgetItem: { groupBy: jest.fn().mockResolvedValue([
        { costType: 'MATERIAL', _sum: { amount: 300 } },
        { costType: 'LABOR', _sum: { amount: 100 } },
      ]) },
    } as never;
    const cache = { wrap: (_k: string, _t: number, fn: () => Promise<unknown>) => fn() } as never;
    const svc = new AnalyticsService(prisma, cache);

    const result = await svc.costComposition();
    expect(result.total).toBe(400);
    expect(result.items.find((i) => i.costType === 'MATERIAL')?.amount).toBe(300);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** → FAIL (`costComposition` not a function).

- [ ] **Step 3: Add contract + service + controller**

Contract:
```ts
export const costCompositionSchema = z.object({
  items: z.array(z.object({ costType: z.string(), amount: z.number() })),
  total: z.number(),
  generatedAt: z.string(),
});
export type CostComposition = z.infer<typeof costCompositionSchema>;
```
Service:
```ts
async costComposition(filter: AnalyticsFilterParams = {}) {
  return this.cache.wrap(analyticsCacheKey('analytics:cost-composition', filter), 60, async () => {
    const groups = await this.prisma.budgetItem.groupBy({
      by: ['costType'],
      where: { status: 'PUBLISHED', ...(filter.legalEntityId ? { project: { legalEntityId: filter.legalEntityId } } : {}) },
      _sum: { amount: true },
    });
    const items = groups.map((g) => ({ costType: g.costType, amount: Number(g._sum?.amount ?? 0) }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    return { items, total, generatedAt: new Date().toISOString() };
  });
}
```
Controller: `@Get('cost-composition') @Permissions(Permission.AnalyticsView)` → `this.analytics.costComposition(query)`.

- [ ] **Step 4: Run test to verify it passes** → PASS. Then `pnpm --filter @aec/api typecheck` clean.

- [ ] **Step 5: Commit** `feat(analytics): cost-composition endpoint`

---

## Task 3: Cost composition donut

**Files:**
- Create: `apps/web/src/widgets/dashboard-charts/cost-composition-chart.tsx`
- Modify: `apps/web/src/features/analytics/model/analytics.api.ts` (add `useCostComposition`)
- Test: `apps/web/src/widgets/dashboard-charts/cost-composition-chart.test.tsx`

**Interfaces:**
- Produces: `hasCostData(items): boolean`; `CostCompositionChart({ items, total })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { hasCostData } from './cost-composition-chart';

describe('hasCostData', () => {
  it('is false when every amount is zero', () => {
    expect(hasCostData([{ costType: 'MATERIAL', amount: 0 }])).toBe(false);
  });
  it('is false for an empty list', () => {
    expect(hasCostData([])).toBe(false);
  });
  it('is true when any amount is positive', () => {
    expect(hasCostData([{ costType: 'MATERIAL', amount: 5 }])).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — `hasCostData(items)` = `items.some(i => i.amount > 0)`. `CostCompositionChart` renders a recharts `PieChart` donut (innerRadius/outerRadius) using `COST_COLORS`, a legend list (costType + amount via `formatIdr` + %), and when `!hasCostData` renders `<EmptyState title="No published budget" description="Publish a budget to see cost composition." />`. Add `useCostComposition(filter)` to the analytics api file.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit** `feat(web): cost composition donut`

---

## Task 4: Cash-flow area + trend

**Files:**
- Create: `apps/web/src/widgets/dashboard-charts/cash-flow-area.tsx`
- Test: `apps/web/src/widgets/dashboard-charts/cash-flow-area.test.tsx`

**Interfaces:**
- Produces: `toAreaSeries(series): { month: string; net: number; cumulative: number }[]`; `CashFlowArea({ series })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { toAreaSeries } from './cash-flow-area';

describe('toAreaSeries', () => {
  it('adds a cumulative net column', () => {
    const out = toAreaSeries([
      { month: '2026-01', cashIn: 100, cashOut: 40, net: 60 },
      { month: '2026-02', cashIn: 50, cashOut: 30, net: 20 },
    ]);
    expect(out[0]!.cumulative).toBe(60);
    expect(out[1]!.cumulative).toBe(80);
  });
  it('handles a single month without dividing by zero', () => {
    const out = toAreaSeries([{ month: '2026-01', cashIn: 10, cashOut: 0, net: 10 }]);
    expect(out).toHaveLength(1);
    expect(out[0]!.cumulative).toBe(10);
  });
  it('returns empty for no series', () => {
    expect(toAreaSeries([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — `toAreaSeries` maps with running cumulative net. `CashFlowArea` renders a recharts `AreaChart` (gradient fill from `CHART.positive`, `Area` for cumulative net + `Line` for monthly net) with token colours; empty series → `EmptyState`.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit** `feat(web): cash flow area + trend`

---

## Task 5: Aging stacked bar

**Files:**
- Create: `apps/web/src/widgets/dashboard-charts/aging-stacked-bar.tsx`
- Test: `apps/web/src/widgets/dashboard-charts/aging-stacked-bar.test.tsx`

**Interfaces:**
- Produces: `AgingStackedBar({ buckets, label })`.

**Status: DONE** — implemented with a per-bucket legend (swatch + label + amount) and `role="img"` aria-label.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgingStackedBar } from './aging-stacked-bar';

describe('AgingStackedBar', () => {
  it('renders an accessible label with the buckets', () => {
    render(<AgingStackedBar buckets={[{ bucket: 'CURRENT', amount: 100 }, { bucket: '90+', amount: 50 }]} label="AR" />);
    expect(screen.getByRole('img', { name: /AR/ }).getAttribute('aria-label')).toContain('CURRENT');
  });
  it('shows an empty message when all buckets are zero', () => {
    render(<AgingStackedBar buckets={[{ bucket: 'CURRENT', amount: 0 }]} label="AR" />);
    expect(screen.getByText(/no outstanding/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — horizontal stacked bar (flex divs like the existing `AgingBar`) with `AGING_COLORS`, bucket legend row, `role="img"` aria-label listing buckets+amounts; all-zero → "No outstanding {label}.".

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit** `feat(web): aging stacked bar`

---

## Task 6: Project ranking bar

**Files:**
- Create: `apps/web/src/widgets/dashboard-charts/project-ranking-bar.tsx`
- Test: `apps/web/src/widgets/dashboard-charts/project-ranking-bar.test.tsx`

**Interfaces:**
- Produces: `rankByVariance(items, limit?): { projectCode: string; projectName: string; variance: number; health: string }[]`; `ProjectRankingBar({ items, onSelect })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { rankByVariance } from './project-ranking-bar';

const items = [
  { projectId: 'p1', projectCode: 'A', projectName: 'A', variance: -10, health: 'CRITICAL' as const },
  { projectId: 'p2', projectCode: 'B', projectName: 'B', variance: 50, health: 'ON_TRACK' as const },
];

describe('rankByVariance', () => {
  it('sorts worst (most negative) first', () => {
    expect(rankByVariance(items as never)[0]!.projectCode).toBe('A');
  });
  it('limits the result', () => {
    expect(rankByVariance(items as never, 1)).toHaveLength(1);
  });
  it('handles a single project without breaking', () => {
    expect(rankByVariance([items[0]] as never)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — `rankByVariance` sorts ascending by variance, slices to `limit ?? 5`. `ProjectRankingBar` renders horizontal bars (width = `|variance| / max|variance|`), coloured by sign, each row clickable → `onSelect(projectId)`; empty → `EmptyState`.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit** `feat(web): project ranking bar`

---

## Task 7: Budget bullet graph

**Files:**
- Create: `apps/web/src/widgets/dashboard-charts/budget-bullet.tsx`
- Test: `apps/web/src/widgets/dashboard-charts/budget-bullet.test.tsx`

**Interfaces:**
- Produces: `bulletWidth(actual, budget): number`; `BudgetBullet({ actual, budget, target? })`.

**Status: DONE** — implemented with an optional target marker (`data-slot="bullet-target"`) and `role="img"` aria-label.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { bulletWidth } from './budget-bullet';

describe('bulletWidth', () => {
  it('is the percentage of actual over budget', () => {
    expect(bulletWidth(82, 100)).toBe(82);
  });
  it('is 0 when budget is 0', () => {
    expect(bulletWidth(50, 0)).toBe(0);
  });
  it('clamps to 100', () => {
    expect(bulletWidth(150, 100)).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement** — `bulletWidth` = `budget > 0 ? Math.min(100, Math.round((actual/budget)*100)) : 0`. `BudgetBullet` renders a track, a filled bar (racing-red), and a target marker (neutral) at the target %; `role="img"` aria-label.

- [ ] **Step 4: Run to verify pass** → PASS.

- [ ] **Step 5: Commit** `feat(web): budget bullet graph`

---

## Task 8: Cards + skeletons + empty states (design-system compliance)

**Files:**
- Modify: `packages/ui/src/primitives/stat-card.tsx`
- Modify: `apps/web/src/widgets/financial-band/financial-band.tsx`
- Modify: `apps/web/src/widgets/liquidity-panel/liquidity-panel.tsx`
- Modify: `apps/web/src/widgets/anomaly-triage/anomaly-triage.tsx`
- Modify: `apps/web/src/widgets/dashboard-charts/charts.tsx` (delete `HealthDonut`, token colors)

**Interfaces:**
- Consumes: `Card`, `Skeleton`, `DeltaBadge`.

- [ ] **Step 1: Replace "Loading…" with shaped skeletons**

In `financial-band`, `liquidity-panel`, `anomaly-triage`: replace `<p>Loading…</p>` with a `<Skeleton>` block shaped like the final layout (e.g. a 220px-tall chart block, 3 rows for triage).

- [ ] **Step 2: Adopt `Card`**

Replace the repeated `rounded-md border border-neutral-200 bg-white p-4 shadow-xs` with `Card` / `CardHeader` / `CardTitle` in the three widgets.

- [ ] **Step 3: `StatCard` uses `DeltaBadge`**

In `stat-card.tsx`, render `<DeltaBadge pct={…} direction={…} />` instead of the inline arrow; keep the same props (map `delta.value` string → parse to number is not needed — change `StatCardProps.delta` to `{ pct: number | null; direction }`).

- [ ] **Step 4: Delete `HealthDonut` and tokenise `charts.tsx`**

Remove `HealthDonut` and its `HEALTH_COLORS`; import colours from `chart-colors.ts`.

- [ ] **Step 5: Run web tests + typecheck** → all pass (fix any call sites of the changed `StatCard.delta`).

- [ ] **Step 6: Commit** `refactor(web): dashboard cards, skeletons, token colors`

---

## Task 9: Layout — KPI strip, Z-pattern, new zones

**Files:**
- Modify: `apps/web/src/widgets/hero-band/hero-band.tsx`
- Modify: `apps/web/src/pages/dashboard.page.tsx`
- Modify: `apps/web/src/pages/dashboard.page.test.tsx`

**Interfaces:**
- Produces: `KpiStrip({ filter, health })` (extracted from hero's 3 StatCards + Cash on hand).

- [ ] **Step 1: Write the failing test**

Add to `dashboard.page.test.tsx`: mock `@/widgets/kpi-strip` and assert `kpi-strip`, `cost-composition`, `project-ranking` testids render.

- [ ] **Step 2: Run to verify fail** → FAIL.

- [ ] **Step 3: Implement**

- New `apps/web/src/widgets/kpi-strip/kpi-strip.tsx`: 4 compact `StatCard`s (Cash on hand, Contract, Budget with delta, Actual cost with bullet %).
- `hero-band.tsx`: keep the single champion figure (Cash on hand, `text-display`) + narrative; remove the 3 StatCards (moved to KpiStrip).
- `dashboard.page.tsx`: zones → `[FilterBar, SignalRail, KpiStrip, (Hero‖Liquidity), (CostComposition‖Aging‖Burn), (Canvas‖Ranking), AnomalyTriage]`. Rename `'Tabel'` → `'Table'`.

- [ ] **Step 4: Run to verify pass** → PASS. Then typecheck.

- [ ] **Step 5: Commit** `feat(web): dashboard Z-pattern layout + KPI strip`

---

## Task 10: Enrich demo seed

**Files:**
- Modify: `apps/api/prisma/seed-demo.ts`

- [ ] **Step 1: Add multi-project + varied data**

Add 3 more projects (At Risk / Critical / No Budget) with WBS + budgets split across `costType` (MATERIAL/LABOR/SUBCONTRACTOR/EQUIPMENT), a couple of open NCRs and an open HSE incident, and 3–4 months of collections/payments so cash flow and aging are non-empty. Keep upserts idempotent.

- [ ] **Step 2: Run the seed against the dev DB**

Run: `$env:DATABASE_URL='…aec_erp…'; pnpm --filter @aec/api exec tsx prisma/seed-demo.ts`
Expected: no error; logs show multiple projects.

- [ ] **Step 3: Verify via API**

Run: `GET /analytics/cost-composition`, `/analytics/signals`, `/analytics/cash-flow` → non-empty.
Expected: cost composition has >1 costType; signals has ≥1; cash flow has >1 month.

- [ ] **Step 4: Commit** `chore(seed): richer demo data for dashboard`

---

## Task 11: Whole-suite verification

- [ ] **Step 1: Typecheck** — `pnpm typecheck` → 10/10.
- [ ] **Step 2: Lint** — `pnpm lint` → 6/6.
- [ ] **Step 3: API unit** — `pnpm --filter @aec/api test:unit` → all pass.
- [ ] **Step 4: Web tests** — `pnpm --filter @aec/web test` → all pass.
- [ ] **Step 5: Manual smoke** — dashboard shows: KPI strip, cash-flow area, cost donut, aging stacked, ranking bars, bullet; no bare "Loading…"; no hardcoded colours.
- [ ] **Step 6: Commit fixes, then push** — `git push -u origin feat/dashboard-polish`.

---

## Self-Review Notes

- **Spec coverage:** token colours → Task 1; cost endpoint → Task 2; 5 visuals → Tasks 3–7; cards/skeletons/empty → Task 8; layout → Task 9; demo data → Task 10; verification → Task 11.
- **Dead code:** `HealthDonut` (Task 8) and `buildSignals` (Task 8, remove from signal-rail + its test).
- **i18n:** `Tabel`→`Table` (Task 9).
- **Risk:** `StatCard.delta` prop shape change (Task 8) touches hero call sites — Task 9 rewrites the hero anyway.
