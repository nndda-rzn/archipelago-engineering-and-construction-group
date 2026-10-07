# Dashboard Enterprise Control Tower — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/` into a maximal enterprise control tower — real EVM, ten visible domains each with a visual chosen by data function, no duplicate figures, keyboard-traceable drill-through — backed by enriched demo data.

**Architecture:** Additive. Extract the EVM rollup into a global shared calculator so `ControlTowerService` can reuse it without a domain→domain import. Enrich `seed-demo.ts` (12 projects, 3 entities, PV baselines, opportunities, warehouses/stock). Render the payload blocks the UI currently discards (HCM, risk matrix, funnel) plus a new inventory block, as ten domain tiles. Replace the seven equal-weight cards.

**Tech Stack:** NestJS 10 + Prisma (PostgreSQL) · React 18 + TanStack Query/Router · Tailwind token preset · recharts 3 · Vitest + RTL (web) · Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-11-dashboard-enterprise-design.md`

## Global Constraints

- All user-facing copy in English; money/date formatting stays `id-ID`.
- Every number renders `font-mono tabular-nums`.
- No metric-card grid as the page backbone; no eyebrow uppercase labels; no decorative pills.
- Every visual carries a non-color partner (`role="img"` + aria-label) and an adjacent text value.
- Errors first: no widget formats a number before handling `isError` (`role="alert"`).
- Backend changes are additive: with no params the endpoint behaves as before.
- One requirement = one branch, PR base `develop`, merge commit (no squash).
- Web tests `*.test.tsx` beside source (Vitest); API unit tests `*.spec.ts` beside source.

## Review Focus

1. **A project with `plannedValue = 0`** must yield `hasEvm=false`, `cpi=null`, `spi=null` — never `Infinity`/`NaN`, never a misleading ratio.
2. **An entity filter that matches nothing** must return valid empty arrays/objects (not `null`), and the tiles must show empty states, not "Rp 0".
3. **A warehouse whose running balance goes negative** must be counted in `negativeBalanceCount` and surfaced, not silently clamped.
4. **An opportunity funnel with a zero-count stage** must still render that stage (length 5, LEAD→WON) so the shape is stable across data.
5. **The scatter with all-null CPI/SPI** (no baselines) must render its honest empty state, not an axis with phantom points.

---

### Task 1: Extract `PortfolioEvmCalculator` into shared (global)

**Files:**
- Create: `apps/api/src/shared/project/portfolio-evm.calculator.ts`
- Modify: `apps/api/src/shared/shared.module.ts`
- Modify: `apps/api/src/modules/project/application/services/portfolio-evm.service.ts`
- Test: `apps/api/src/shared/project/portfolio-evm.calculator.spec.ts`

**Interfaces:**
- Produces: `PortfolioEvmCalculator.computeBatch(projectIds: string[]): Promise<Map<string, EvmRollup>>` where `EvmRollup = { bac, ev, pv, ac, cpi: number|null, spi: number|null, eac, vac, tcpi: number|null, progressPercent, hasEvm: boolean }`; and `computeTotals(rollups: EvmRollup[]): { bac, ev, pv, ac, cpi: number|null, spi: number|null, eac, vac }`.
- Consumes: `PrismaService`, `ActualCostCalculator` (both global).

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/shared/project/portfolio-evm.calculator.spec.ts
import { PortfolioEvmCalculator } from './portfolio-evm.calculator';

function makeCalc(over: Partial<Record<string, unknown>> = {}) {
  const prisma = {
    budgetItem: { groupBy: async () => [{ projectId: 'p1', _sum: { amount: 1000 } }] },
    controlAccount: { groupBy: async () => [{ projectId: 'p1', _sum: { plannedValue: 600 } }] },
    workPackageProgress: { groupBy: async () => [{ workPackageId: 'w1', _max: { physicalProgress: 50 } }] },
    constructionWorkPackage: { findMany: async () => [{ id: 'w1', projectId: 'p1' }] },
    ...over,
  };
  const actualCost = { computeBatch: async () => new Map([['p1', 500]]) };
  return new PortfolioEvmCalculator(prisma as never, actualCost as never);
}

describe('PortfolioEvmCalculator', () => {
  it('computes CPI/SPI when a PV baseline exists', async () => {
    const m = await makeCalc().computeBatch(['p1']);
    const r = m.get('p1')!;
    expect(r.hasEvm).toBe(true);
    expect(r.ev).toBe(500);   // bac 1000 × progress 50%
    expect(r.cpi).toBe(1);    // 500/500
    expect(r.spi).toBe(0.8333); // 500/600
  });

  it('returns hasEvm=false and null ratios when pv = 0', async () => {
    const m = await makeCalc({ controlAccount: { groupBy: async () => [] } }).computeBatch(['p1']);
    const r = m.get('p1')!;
    expect(r.hasEvm).toBe(false);
    expect(r.cpi).toBeNull();
    expect(r.spi).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- portfolio-evm.calculator`
Expected: FAIL — cannot find module `./portfolio-evm.calculator`.

- [ ] **Step 3: Implement `PortfolioEvmCalculator`**

Move the per-project computation body from `portfolio-evm.service.ts:43-121` into `computeBatch`. Keep the exact rounding helpers (`round2`, `round4`) and the `hasEvm = pv > 0` gate. `computeTotals` mirrors `:123-138`.

- [ ] **Step 4: Register in `SharedModule`**

Add `PortfolioEvmCalculator` to both `providers` and `exports` in `shared.module.ts` (pattern already used for `ActualCostCalculator`).

- [ ] **Step 5: Refactor `PortfolioEvmService` to delegate**

`portfolioEvm(filter)` calls `calculator.computeBatch(ids)` then `computeTotals(...)`; delete the inlined math. Keep the response shape identical.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @aec/api test:unit -- portfolio-evm` and `pnpm --filter @aec/api typecheck`
Expected: PASS (both the new calculator spec and the existing `portfolio-evm.service.spec.ts`).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/shared/project/portfolio-evm.calculator.ts apps/api/src/shared/project/portfolio-evm.calculator.spec.ts apps/api/src/shared/shared.module.ts apps/api/src/modules/project/application/services/portfolio-evm.service.ts
git commit -m "refactor(project): extract PortfolioEvmCalculator to shared (global)"
```

---

### Task 2: Control Tower computes real EVM

**Files:**
- Modify: `apps/api/src/modules/analytics/application/services/control-tower.service.ts` (`loadPortfolio`, constructor)
- Test: `apps/api/src/modules/analytics/application/services/control-tower.service.spec.ts`

**Interfaces:**
- Consumes: `PortfolioEvmCalculator.computeBatch` (Task 1).
- Produces: `ControlTower.projects[].cpi/spi/hasEvm` populated from the rollup.

- [ ] **Step 1: Write the failing test**

Add to the existing `ControlTowerService (shape)` describe: inject a calculator stub returning one rollup, and assert the project carries real ratios.

```ts
it('fills cpi/spi/hasEvm from the EVM rollup', async () => {
  const svc = makeService(); // extend makeService to pass the calculator stub
  const out = await svc.controlTower({});
  expect(out.projects[0].hasEvm).toBe(true);
  expect(out.projects[0].cpi).toBeCloseTo(0.82, 2);
});
```

`makePrisma()` must return one project with a budget; the calculator stub returns `new Map([[projectId, { cpi: 0.82, spi: 0.91, hasEvm: true, ... }]])`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- control-tower`
Expected: FAIL — `projects[0].hasEvm` is `false` (hardcoded).

- [ ] **Step 3: Implement**

Inject `PortfolioEvmCalculator` into the constructor (5th arg, global so no module change). In `loadPortfolio`, call `computeBatch(projectIds)` and map `cpi/spi/hasEvm` onto each project, replacing the hardcoded `cpi: null, spi: null, hasEvm: false` at `:294-296`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @aec/api test:unit -- control-tower`
Expected: PASS. The existing "zero data" test still passes (`hasEvm=false` when no baseline).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/application/services/control-tower.service.ts apps/api/src/modules/analytics/application/services/control-tower.service.spec.ts
git commit -m "feat(analytics): compute real EVM in the control tower"
```

---

### Task 3: Add `operations.inventory` block

**Files:**
- Modify: `packages/api-contracts/src/analytics.ts` (`controlTowerOperationsSchema`)
- Modify: `apps/api/src/modules/analytics/application/services/control-tower.service.ts` (`loadInventory`, `controlTower`)
- Test: `apps/api/src/modules/analytics/application/services/control-tower.service.spec.ts`

**Interfaces:**
- Produces: `operations.inventory = { stockValue: number; warehouseCount: number; negativeBalanceCount: number; movementInValue: number; movementOutValue: number }`.

- [ ] **Step 1: Write the failing test**

```ts
it('returns a valid inventory block (zeros, not null)', async () => {
  const out = await makeService().controlTower({});
  expect(out.operations.inventory).toEqual({
    stockValue: 0, warehouseCount: 0, negativeBalanceCount: 0, movementInValue: 0, movementOutValue: 0,
  });
});

it('counts a warehouse whose running balance went negative', async () => {
  const out = await makeService({
    stockLedgerEntry: { findMany: async () => [{ warehouseId: 'w1', balanceAfter: -5 }], groupBy: async () => [], count: async () => 0 },
    warehouse: { count: async () => 1, findMany: async () => [] },
  }).controlTower({});
  expect(out.operations.inventory.negativeBalanceCount).toBe(1);
});
```

`makeService` must accept a Prisma override object merged over `makePrisma()` so this second test can inject the negative-balance rows.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- control-tower`
Expected: FAIL — `operations.inventory` is undefined.

- [ ] **Step 3: Implement schema + loader**

Add the five fields to `controlTowerOperationsSchema` (all `z.number()`). Add `loadInventory(projectWhere, dateWhere)` to `ControlTowerService`: `warehouse.count`, `stockLedgerEntry.groupBy({ by:['movementType'], _sum:{ totalValue:true } })` for in/out, `warehouse.count` where any ledger row has `balanceAfter < 0` for `negativeBalanceCount`. Wire it into the `operations` object. Extend the Prisma stub in `makePrisma()` with `warehouse` and `stockLedgerEntry`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @aec/api test:unit -- control-tower` and `pnpm --filter @aec/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/analytics.ts apps/api/src/modules/analytics/application/services/control-tower.service.ts apps/api/src/modules/analytics/application/services/control-tower.service.spec.ts
git commit -m "feat(analytics): add operations.inventory to the control tower payload"
```

---

### Task 4: Enrich the demo seed

**Files:**
- Modify: `apps/api/prisma/seed-demo.ts`
- Test: manual (seed is a script; verified by re-running + the API smoke in Step 5)

**Interfaces:**
- Produces: DB rows — 2 extra `LegalEntity`, ~11 extra `Project`, `ControlAccount` (PV) per EVM project, `WorkPackageProgress`, `Opportunity` set, `Warehouse` + `StockLedgerEntry` (incl. one negative), spread `Ncr`/`HseIncident`/`Equipment`.

- [ ] **Step 1: Add a `seedPortfolio()` function**

Idempotent (`upsert` by unique code) like the existing blocks. Create:
- Legal entities `AEC-MAR` (Marine) and `AEC-PWR` (Power) beside `AEC-CON`.
- 11 projects across the 3 entities with `businessUnit`, `location`, `currency` (2 non-IDR), varied `status`; deliberate mix: 6 under budget (CPI>1), 4 overrun (CPI<1), 2 `NO_BUDGET` (no ControlAccount → `hasEvm=false`).
- Per EVM project: `ControlAccount` with `plannedValue`; `ConstructionWorkPackage` + `WorkPackageProgress.physicalProgress`; `BudgetItem` PUBLISHED; POSTED `VendorInvoice` (AC).
- `Opportunity` rows spanning all five stages + CLOSED_WON/LOST.
- `Warehouse` per project + `StockLedgerEntry` GR/ISSUE/ADJUSTMENT; one warehouse driven to a negative `balanceAfter`.
- Spread `Ncr`, `HseIncident`, `EquipmentUtilization` across several projects (not just one).

- [ ] **Step 2: Call it from `main()`**

Insert `await seedPortfolio();` after the existing blocks, before `seedWorkflowDemo()`.

- [ ] **Step 3: Run the seed twice**

Run: `pnpm --filter @aec/api db:seed` (twice)
Expected: second run creates no duplicates (counts stable).

- [ ] **Step 4: Verify the payload**

Run: `pnpm --filter @aec/api test:unit -- control-tower`
Expected: PASS (shape tests still green).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed-demo.ts
git commit -m "feat(seed): 12-project multi-entity portfolio with EVM, opportunities, inventory"
```

---

### Task 5: `RiskHeatmap` primitive

**Files:**
- Create: `packages/ui/src/primitives/risk-heatmap.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/shared/ui/risk-heatmap.test.tsx`

**Interfaces:**
- Produces: `RiskHeatmap({ cells, className }: { cells: { likelihood: number; impact: number; count: number }[] })` — 5×5 grid; intensity = count; `role="img"` with an aria-label enumerating non-empty cells.

> Note: `packages/ui` has **no test runner** (lint/typecheck/build only). All primitive tests live in `apps/web/src/shared/ui/` and run via `pnpm --filter @aec/web test`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/shared/ui/risk-heatmap.test.tsx
import { render, screen } from '@testing-library/react';
import { RiskHeatmap } from '@aec/ui';

it('renders a 5x5 grid and labels non-empty cells', () => {
  render(<RiskHeatmap cells={[{ likelihood: 4, impact: 5, count: 2 }]} />);
  expect(screen.getByRole('img')).toHaveAccessibleName(/4.*5.*2/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- risk-heatmap`
Expected: FAIL — `RiskHeatmap` is not exported from `@aec/ui`.

- [ ] **Step 3: Implement**

5×5 grid of cells; empty cells neutral; filled cells use a single-hue ramp (`warning-*`), never red-as-category. Each cell carries `title` with `L×I = count`.

- [ ] **Step 4: Run test**

Run: `pnpm --filter @aec/web test -- risk-heatmap`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/primitives/risk-heatmap.tsx packages/ui/src/index.ts apps/web/src/shared/ui/risk-heatmap.test.tsx
git commit -m "feat(ui): add RiskHeatmap primitive"
```

---

### Task 6: `StageBars` primitive

**Files:**
- Create: `packages/ui/src/primitives/stage-bars.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/shared/ui/stage-bars.test.tsx`

**Interfaces:**
- Produces: `StageBars({ stages, className }: { stages: { stage: string; count: number; value: number }[] })` — horizontal bars in given order (LEAD→WON), each with a text value.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/shared/ui/stage-bars.test.tsx
import { render, screen } from '@testing-library/react';
import { StageBars } from '@aec/ui';

it('renders one labelled bar per stage in order', () => {
  render(<StageBars stages={[{ stage: 'LEAD', count: 5, value: 100 }, { stage: 'WON', count: 1, value: 20 }]} />);
  expect(screen.getAllByRole('img')).toHaveLength(2);
  expect(screen.getByText('LEAD')).toBeTruthy();
  expect(screen.getByText('WON')).toBeTruthy();
});

it('still renders a zero-count stage', () => {
  render(<StageBars stages={[{ stage: 'PROPOSAL', count: 0, value: 0 }]} />);
  expect(screen.getByText('PROPOSAL')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- stage-bars`
Expected: FAIL — `StageBars` is not exported from `@aec/ui`.

- [ ] **Step 3: Implement**

Bar width = `value / max(value)`; zero-count stages still render a 0-width bar with their label. Each bar is `role="img"` with aria-label `"{stage}: {count} · {value}"`.

- [ ] **Step 4: Run test**

Run: `pnpm --filter @aec/web test -- stage-bars`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/primitives/stage-bars.tsx packages/ui/src/index.ts apps/web/src/shared/ui/stage-bars.test.tsx
git commit -m "feat(ui): add StageBars primitive"
```

---

### Task 7: Ten domain tiles replace the seven cards

**Files:**
- Create: `apps/web/src/widgets/control-tower/domain-tiles.tsx`
- Modify: `apps/web/src/widgets/control-tower/control-tower.tsx` (replace T4 + T6 sections)
- Test: `apps/web/src/widgets/control-tower/domain-tiles.test.tsx`

**Interfaces:**
- Consumes: `ControlTower` payload; primitives `DivergingBar`, `StackedBar`, `BulletBar`, `MiniStackedBar`, `Sparkline`, `RiskHeatmap` (Task 5), `StageBars` (Task 6).
- Produces: `DomainTiles({ data }: { data: ControlTower })` rendering the ten tiles from spec §7.

- [ ] **Step 1: Write the failing test**

```tsx
it('renders all ten domain tiles', () => {
  render(<DomainTiles data={sampleTower} />);
  for (const name of ['Liquidity','Portfolio health','Safety','Quality','Procurement','HCM','Inventory','Governance','Commercial','Treasury'])
    expect(screen.getByRole('heading', { name })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- domain-tiles`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

One tile per row of spec §7; each tile = `Card` (or plain section) with a normal-case heading, the mapped visual, and a text value beside it. Remove the `T4` "Operational pulse" and `T6` "Governance · Commercial · Treasury" blocks from `control-tower.tsx` and mount `<DomainTiles/>` instead.

- [ ] **Step 4: Run test**

Run: `pnpm --filter @aec/web test -- domain-tiles` and `pnpm --filter @aec/web typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/control-tower/domain-tiles.tsx apps/web/src/widgets/control-tower/domain-tiles.test.tsx apps/web/src/widgets/control-tower/control-tower.tsx
git commit -m "feat(dashboard): ten domain tiles with function-matched visuals"
```

---

### Task 8: Portfolio ledger drill-through + scatter

**Files:**
- Modify: `apps/web/src/widgets/control-tower/control-tower.tsx` (`PortfolioLedger`)
- Create: `apps/web/src/widgets/control-tower/portfolio-scatter.tsx`
- Test: `apps/web/src/widgets/control-tower/control-tower.test.tsx`, `portfolio-scatter.test.tsx`

**Interfaces:**
- Consumes: `DataGrid` (`@aec/ui`), `useNavigate`.
- Produces: `PortfolioScatter({ projects }: { projects: ControlTowerProject[] })`.

- [ ] **Step 1: Write the failing tests**

```tsx
// control-tower.test.tsx
it('makes a ledger row focusable and navigates on Enter', () => {
  const { getAllByRole } = render(<PortfolioLedger data={sampleTower} />);
  const row = getAllByRole('row')[1];
  expect(row.getAttribute('tabindex')).toBe('0');
});

// portfolio-scatter.test.tsx
it('shows an honest empty state when no project has EVM', () => {
  render(<PortfolioScatter projects={[{ ...p, hasEvm: false }]} />);
  expect(screen.getByText(/no evm/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aec/web test -- control-tower portfolio-scatter`
Expected: FAIL.

- [ ] **Step 3: Implement**

Replace the hand-written `<table>` with `DataGrid` (`onRowClick` → `/project-health?project={id}`, which supplies `tabIndex` + Enter/Space per the F15 fix). Add `PortfolioScatter` (recharts scatter, CPI×SPI, quadrant lines at 1.0, honest empty state). Mount both in T5.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @aec/web test -- control-tower portfolio-scatter`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/control-tower/control-tower.tsx apps/web/src/widgets/control-tower/control-tower.test.tsx apps/web/src/widgets/control-tower/portfolio-scatter.tsx apps/web/src/widgets/control-tower/portfolio-scatter.test.tsx
git commit -m "feat(dashboard): keyboard drill-through ledger and CPI/SPI scatter"
```

---

### Task 9: Remove duplicate figures + KPI sparkline

**Files:**
- Modify: `apps/web/src/widgets/control-tower/control-tower.tsx` (T2 `StatTile`, delete duplicate rows)
- Modify: `apps/web/src/pages/dashboard.page.tsx` (pass cash series to T2)
- Test: `apps/web/src/widgets/control-tower/control-tower.test.tsx`

**Interfaces:**
- Consumes: `cashFlowSeries` (already passed to `ControlTowerView`).
- Produces: each metric label appears exactly once.

- [ ] **Step 1: Write the failing test**

```tsx
it('renders each metric label exactly once across the page', () => {
  render(<ControlTowerView data={sampleTower} cashFlowSeries={[]} />);
  expect(screen.getAllByText('AR overdue 61+')).toHaveLength(1);
  expect(screen.getAllByText('DSO')).toHaveLength(1);
  expect(screen.getAllByText('FX exposure')).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- control-tower`
Expected: FAIL — labels currently appear twice.

- [ ] **Step 3: Implement**

Delete the duplicated rows from the old Working capital / Treasury cards (now owned by the domain tiles). Give the cash `StatTile` a `viz={<Sparkline values={netSeries} .../>}`.

- [ ] **Step 4: Run test**

Run: `pnpm --filter @aec/web test -- control-tower`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/control-tower/control-tower.tsx apps/web/src/pages/dashboard.page.tsx apps/web/src/widgets/control-tower/control-tower.test.tsx
git commit -m "fix(dashboard): one home per metric, sparkline on cash KPI"
```

---

### Task 10: Cleanup — dead widgets, DEMO badge, healthMeta, dead export

**Files:**
- Delete: `apps/web/src/widgets/{hero-band,liquidity-panel,financial-band,portfolio-canvas,signal-rail,capital-structure}/`
- Create: `apps/web/src/entities/health/lib/health-meta.ts`
- Modify: importers of `healthMeta` (`pages/project/project-detail.page.tsx`, `features/analytics/lib/dashboard-rows.ts`, `features/project/ui/project-views.tsx`)
- Modify: `apps/web/src/app/layouts/app-shell.tsx` (remove `ENV_LABEL` + badge)
- Modify: `apps/web/src/widgets/control-tower/control-tower.tsx` (remove `AnomalyHeader`)
- Test: `pnpm --filter @aec/web test` (whole suite)

**Interfaces:**
- Produces: `healthMeta` + `HealthKey` at `@/entities/health`; no dead widget modules.

- [ ] **Step 1: Extract `healthMeta` first**

Create `entities/health/lib/health-meta.ts` with the `healthMeta` map and `HealthKey` type (moved verbatim from `portfolio-spine.tsx:9-17`). Repoint the three importers. Keep `portfolio-spine` for now.

- [ ] **Step 2: Run tests to confirm no breakage**

Run: `pnpm --filter @aec/web test` and `pnpm --filter @aec/web typecheck`
Expected: PASS.

- [ ] **Step 3: Delete dead widgets + badge + dead export**

Delete the six widget directories (with their tests). Remove `ENV_LABEL` and the environment `<span>` in `app-shell.tsx:10-11,159-164`. Remove `AnomalyHeader` from `control-tower.tsx:327-341`.

- [ ] **Step 4: Verify nothing references them**

Run: `rg -n "hero-band|liquidity-panel|financial-band|portfolio-canvas|signal-rail|capital-structure|ENV_LABEL|AnomalyHeader" apps/web/src`
Expected: no matches.

- [ ] **Step 5: Full gate**

Run: `pnpm typecheck` (10/10) and `pnpm lint` (6/6) and `pnpm --filter @aec/web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(dashboard): remove dead widgets, DEMO badge, and dead export"
```

---

## Git flow

```
develop ─┬─ feature/dash-ent-01-evm-calculator   Task 1
         ├─ feature/dash-ent-02-ct-evm           Task 2  (after 1)
         ├─ feature/dash-ent-03-inventory        Task 3  (after 1)
         ├─ feature/dash-ent-04-seed             Task 4  (after 2,3)
         ├─ feature/dash-ent-05-risk-heatmap     Task 5
         ├─ feature/dash-ent-06-stage-bars       Task 6
         ├─ feature/dash-ent-07-domain-tiles     Task 7  (after 3,5,6)
         ├─ feature/dash-ent-08-ledger-scatter   Task 8  (after 2)
         ├─ feature/dash-ent-09-dedupe-kpi       Task 9  (after 7)
         └─ feature/dash-ent-10-cleanup          Task 10 (after 7,8,9)
```

CI only runs when the PR base is `develop`/`main`. Do **not** stack PRs.

## Verification gate (per PR)

```bash
pnpm lint
pnpm typecheck
pnpm --filter @aec/api test:unit
pnpm --filter @aec/web test
```

## Definition of Done

1. `/` shows ten domains, each with a function-matched visual (spec §7).
2. EVM is real: scatter and EVM bullets populated when baselines exist.
3. No metric label appears twice; every figure has a target or delta.
4. No metric-card grid; no eyebrow-uppercase walls.
5. Failed read → `role="alert"`; never "Rp 0".
6. Ledger drill-through works by keyboard.
7. All gates green.
