# Dashboard Phase B — Financial Intelligence & Visual Coherence

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the Phase A dashboard into a real ERP *instrument*: a hero that shows cash on hand + runway, a portfolio canvas plotting CPI×SPI (cost vs schedule efficiency), a rich visual table with bullet/stacked bars + EVM column, a liquidity panel, and a segmented aging view — all inside the existing AEC design system.

**Architecture:** One new additive API endpoint (`GET /projects/portfolio/evm`) that rolls up per-project EVM (CPI/SPI/EAC/VAC/TCPI) using the existing `EarnedValueService` math. Frontend gains one new `@aec/ui` primitive (`Sparkline`) and rewrites the dashboard's Hero, Liquidity, Financial, and Portfolio zones. Health classification is **unchanged** (EVM is an added indicator, not a replacement). No new colors/fonts/radii.

**Tech Stack:** React 18 + TanStack Query/Router, recharts 3, Tailwind token preset, NestJS 10 + Prisma, Zod (`@aec/api-contracts`), Vitest + RTL (web), Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-05-dashboard-redesign-phase-b-design.md`

## Global Constraints

- Design system-first: **no new colors/fonts/radii**. Reuse `racing-red`, `neutral`, `success/warning/destructive/info`, `project-*`, `financial-positive/negative`, and the `display`/`h1`/`h2`/`h3`/`body`/`caption`/`overline` ramp.
- All user-facing copy in **English**. Money/date formatting stays `id-ID` via `@/shared/lib/format`.
- API params remain **optional**; no params ⇒ whole-portfolio result.
- `classifyHealth` (`apps/api/src/shared/project/project-health.classifier.ts`) is **NOT** modified — EVM is an additional indicator.
- Health/EVM is never colour-alone: always a dot/badge **and** a text label.
- Numbers render `font-mono tabular-nums`.
- Two cash metrics with explicit labels: **"Cash on hand"** = `/treasury/cash-position` `totalBalance`; **"Net cash flow"** = analytics `cashIn − cashOut`.
- EAC = `BAC / CPI` when CPI > 0 else BAC; VAC = `BAC − EAC`; TCPI = `(BAC − EV) / (BAC − AC)` when denominator > 0 else null.
- Projects without EVM data carry `hasEvm: false` and are shown honestly (grey marker / "—"), never coerced to 0.
- Web tests are `*.test.tsx` next to source (Vitest, `globals:false`, RTL cleanup in `src/test/setup.ts`). API unit tests are `*.spec.ts` next to source.
- Commit after every task. Branch: `feat/dashboard-phase-b`.

## Review Focus

Inputs/conditions the spec implies but no task's happy-path test covers — each pinned by a test in the task noted:

1. **CPI = 0 or AC = 0** must not divide by zero producing `Infinity`; EAC falls back to BAC, TCPI is null. (Task 3)
2. **Project with no ControlAccount (PV = 0)** must report `hasEvm:false`, not `SPI = null` leaking into an average. (Task 3)
3. **A project with no revenue and no budget** on the canvas must not break axis scaling (`usage`/`margin` = 0). (Task 6)
4. **Empty portfolio** (zero projects) must render empty states, not a crash on `Math.max()` of an empty array. (Tasks 4, 6, 7)
5. **Aging with all-zero buckets** must show "No outstanding" rather than a zero-width bar. (Task 8)

---

## File Structure

**New — `apps/api/src/modules/project/application/services/`**
- `portfolio-evm.service.ts` — rollup EVM across projects (or one legal entity).

**New — `apps/web/src/widgets/`**
- `liquidity-panel/` — cash on hand, burn sparkline, runway, AR/AP bars, working-capital gap.

**New — `packages/ui/src/primitives/`**
- `sparkline.tsx` — tiny inline SVG trend line with accessible label.

**Modified — API**
- `apps/api/src/modules/project/presentation/controllers/project.controller.ts` — add `GET /projects/portfolio/evm`.
- `apps/api/src/modules/project/project.module.ts` — register `PortfolioEvmService`.

**Modified — contracts**
- `packages/api-contracts/src/project.ts` — `portfolioEvmSchema`, `portfolioEvmItemSchema`.

**Modified — web**
- `packages/ui/src/index.ts` — export `Sparkline`.
- `apps/web/src/widgets/hero-band/hero-band.tsx` — Cash on hand hero + net cash flow context.
- `apps/web/src/widgets/financial-band/financial-band.tsx` — segmented aging + budget burn (already partly there); tighten.
- `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx` — CPI×SPI axes.
- `apps/web/src/widgets/portfolio-spine/portfolio-spine.tsx` — EVM column, richer cells.
- `apps/web/src/widgets/signal-rail/signal-rail.tsx` — real filtering deep-links.
- `apps/web/src/features/project/model/project.api.ts` — `usePortfolioEvm(filter)`.
- `apps/web/src/features/treasury/model/treasury.api.ts` — reuse `useCashPosition` (already exists).
- `apps/web/src/pages/dashboard.page.tsx` — wire LiquidityPanel into Zona 2.

---

## Task 1: `Sparkline` primitive

**Files:**
- Create: `packages/ui/src/primitives/sparkline.tsx`
- Modify: `packages/ui/src/index.ts`
- Test: `apps/web/src/test/sparkline.test.tsx`

**Interfaces:**
- Produces: `Sparkline({ values, width?, height?, stroke?, label })` — renders an inline SVG polyline; `role="img"` with `aria-label` = `${label}: ${min}–${max}`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/test/sparkline.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from '@aec/ui';

describe('Sparkline', () => {
  it('exposes an accessible label with the value range', () => {
    render(<Sparkline values={[3, 5, 4, 8]} label="Burn" />);
    expect(screen.getByRole('img', { name: /Burn: 3.8/ }).getAttribute('aria-label')).toContain('8');
  });

  it('renders a polyline for multiple points', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} label="X" />);
    expect(container.querySelector('polyline')).toBeTruthy();
  });

  it('renders nothing (no polyline) for a single point', () => {
    const { container } = render(<Sparkline values={[1]} label="X" />);
    expect(container.querySelector('polyline')).toBeNull();
  });

  it('handles all-equal values without dividing by zero', () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} label="Flat" />);
    expect(container.querySelector('polyline')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- sparkline`
Expected: FAIL — `Sparkline` not exported from `@aec/ui`.

- [ ] **Step 3: Implement `Sparkline`**

`sparkline.tsx`: compute `min`, `max`; if `values.length < 2` render an empty `<svg>` (still `role="img"`); otherwise map each value to `x = (i/(n-1))*width`, `y = height - ((v-min)/(max-min || 1))*height`; render `<polyline fill="none" stroke={stroke} strokeWidth={1.5} points="…" />`. Defaults `width=120`, `height=28`, `stroke="#dc2626"` (racing-red-600). Wrapper `<svg role="img" aria-label={\`${label}: ${min}–${max}\`}>`.

- [ ] **Step 4: Export from barrel**

Add `export { Sparkline, type SparklineProps } from './primitives/sparkline';`

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- sparkline`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/primitives/sparkline.tsx packages/ui/src/index.ts apps/web/src/test/sparkline.test.tsx
git commit -m "feat(ui): Sparkline primitive"
```

---

## Task 2: Portfolio EVM contracts

**Files:**
- Modify: `packages/api-contracts/src/project.ts`

**Interfaces:**
- Produces: `portfolioEvmItemSchema`, `type PortfolioEvmItem`, `portfolioEvmSchema`, `type PortfolioEvm`.
  - item: `{ projectId, projectCode, projectName, bac, ev, pv, ac, cpi: number|null, spi: number|null, eac, vac, tcpi: number|null, progressPercent, hasEvm: boolean }`
  - root: `{ items: PortfolioEvmItem[], totals: { bac, ev, pv, ac, cpi: number|null, spi: number|null, eac, vac }, generatedAt: string }`

- [ ] **Step 1: Write the failing test**

```ts
// packages/api-contracts/src/project.test.ts
import { describe, expect, it } from 'vitest';
import { portfolioEvmSchema } from './project';

describe('portfolioEvmSchema', () => {
  it('accepts a project with full EVM data', () => {
    const parsed = portfolioEvmSchema.parse({
      items: [{ projectId: 'p1', projectCode: 'A', projectName: 'A', bac: 100, ev: 50, pv: 60, ac: 40, cpi: 1.25, spi: 0.83, eac: 80, vac: 20, tcpi: 1.1, progressPercent: 50, hasEvm: true }],
      totals: { bac: 100, ev: 50, pv: 60, ac: 40, cpi: 1.25, spi: 0.83, eac: 80, vac: 20 },
      generatedAt: '2026-10-05T00:00:00.000Z',
    });
    expect(parsed.items[0]!.hasEvm).toBe(true);
  });

  it('accepts null cpi/spi/tcpi for a project without EVM data', () => {
    const parsed = portfolioEvmSchema.parse({
      items: [{ projectId: 'p2', projectCode: 'B', projectName: 'B', bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0, tcpi: null, progressPercent: 0, hasEvm: false }],
      totals: { bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0 },
      generatedAt: '2026-10-05T00:00:00.000Z',
    });
    expect(parsed.items[0]!.cpi).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api-contracts test -- project` (if vitest not configured for contracts, run from `apps/web` with an import — otherwise verify via `pnpm --filter @aec/api-contracts typecheck` and rely on Task 3's service test).
Expected: FAIL — `portfolioEvmSchema` is not exported.

> Note: `packages/api-contracts` has no test runner configured. If `test` is unavailable there, place this test at `apps/web/src/shared/lib/portfolio-evm-contract.test.ts` importing `portfolioEvmSchema` from `@aec/api-contracts` and run it with the web runner.

- [ ] **Step 3: Add the schemas**

Append to `packages/api-contracts/src/project.ts`:

```ts
export const portfolioEvmItemSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  projectName: z.string(),
  bac: z.number(),
  ev: z.number(),
  pv: z.number(),
  ac: z.number(),
  cpi: z.number().nullable(),
  spi: z.number().nullable(),
  eac: z.number(),
  vac: z.number(),
  tcpi: z.number().nullable(),
  progressPercent: z.number(),
  hasEvm: z.boolean(),
});
export type PortfolioEvmItem = z.infer<typeof portfolioEvmItemSchema>;

export const portfolioEvmSchema = z.object({
  items: z.array(portfolioEvmItemSchema),
  totals: z.object({
    bac: z.number(), ev: z.number(), pv: z.number(), ac: z.number(),
    cpi: z.number().nullable(), spi: z.number().nullable(), eac: z.number(), vac: z.number(),
  }),
  generatedAt: z.string(),
});
export type PortfolioEvm = z.infer<typeof portfolioEvmSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api-contracts typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/project.ts apps/web/src/shared/lib/portfolio-evm-contract.test.ts
git commit -m "feat(contracts): portfolio EVM schema"
```

---

## Task 3: `PortfolioEvmService` + endpoint

**Files:**
- Create: `apps/api/src/modules/project/application/services/portfolio-evm.service.ts`
- Create: `apps/api/src/modules/project/application/services/portfolio-evm.service.spec.ts`
- Modify: `apps/api/src/modules/project/presentation/controllers/project.controller.ts`
- Modify: `apps/api/src/modules/project/project.module.ts`

**Interfaces:**
- Consumes: `PortfolioEvmItem` (Task 2), `ActualCostCalculator.computeBatch(projectIds)`.
- Produces: `PortfolioEvmService.portfolioEvm(filter: { legalEntityId?: string } = {})` returning `PortfolioEvm`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/project/application/services/portfolio-evm.service.spec.ts
import { PortfolioEvmService } from './portfolio-evm.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    project: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p1', code: 'PRJ-1', name: 'One', legalEntityId: 'LE1' },
        { id: 'p2', code: 'PRJ-2', name: 'Two', legalEntityId: 'LE1' },
      ]),
    },
    controlAccount: { aggregate: jest.fn(), groupBy: jest.fn() },
    budgetItem: { groupBy: jest.fn().mockResolvedValue([{ projectId: 'p1', _sum: { amount: 100 } }]) },
    workPackageProgress: { groupBy: jest.fn().mockResolvedValue([]) },
    constructionWorkPackage: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  } as never;
}

describe('PortfolioEvmService', () => {
  it('marks a project with PV=0 as hasEvm:false and does not produce Infinity', async () => {
    const prisma = makePrisma({
      controlAccount: { aggregate: jest.fn().mockResolvedValue({ _sum: { plannedValue: 0 } }), groupBy: jest.fn().mockResolvedValue([]) },
    });
    const actualCost = { computeBatch: jest.fn().mockResolvedValue(new Map([['p1', 40], ['p2', 0]])) } as never;
    const svc = new PortfolioEvmService(prisma, actualCost);

    const result = await svc.portfolioEvm();
    const p1 = result.items.find((i) => i.projectId === 'p1')!;

    expect(p1.hasEvm).toBe(false);
    expect(p1.cpi).toBeNull();
    expect(p1.spi).toBeNull();
    expect(Number.isFinite(p1.eac)).toBe(true);
    expect(p1.eac).toBe(100); // falls back to BAC
    expect(p1.tcpi).toBeNull();
  });

  it('computes cpi/eac/vac/tcpi when EVM data exists', async () => {
    const prisma = makePrisma({
      controlAccount: { aggregate: jest.fn().mockResolvedValue({ _sum: { plannedValue: 60 } }), groupBy: jest.fn().mockResolvedValue([]) },
    });
    const actualCost = { computeBatch: jest.fn().mockResolvedValue(new Map([['p1', 40], ['p2', 0]])) } as never;
    const svc = new PortfolioEvmService(prisma, actualCost);

    const result = await svc.portfolioEvm();
    const p1 = result.items.find((i) => i.projectId === 'p1')!;

    // BAC=100, progress=0 → EV=0, AC=40 → cpi = 0/40 = 0
    expect(p1.hasEvm).toBe(true);
    expect(p1.cpi).toBe(0);
    expect(p1.eac).toBe(100); // cpi <= 0 → fallback BAC
    expect(p1.tcpi).toBeCloseTo(1.67, 2); // (BAC-EV)/(BAC-AC) = 100/60
  });

  it('scopes projects by legalEntityId when provided', async () => {
    const prisma = makePrisma();
    const actualCost = { computeBatch: jest.fn().mockResolvedValue(new Map()) } as never;
    const svc = new PortfolioEvmService(prisma, actualCost);
    await svc.portfolioEvm({ legalEntityId: 'LE1' });
    expect((prisma as { project: { findMany: jest.Mock } }).project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { legalEntityId: 'LE1' } }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- portfolio-evm`
Expected: FAIL — cannot find module `./portfolio-evm.service`.

- [ ] **Step 3: Implement `PortfolioEvmService`**

`portfolio-evm.service.ts`: constructor injects `PrismaService` and `ActualCostCalculator`.
- `projects = await prisma.project.findMany({ where: filter.legalEntityId ? { legalEntityId } : {}, select: { id, code, name } })`.
- `bacByProject`: `budgetItem.groupBy({ by:['projectId'], where:{ projectId:{in:ids}, status:'PUBLISHED' }, _sum:{ amount:true } })`.
- `pvByProject`: `controlAccount.groupBy({ by:['projectId'], where:{ projectId:{in:ids} }, _sum:{ plannedValue:true } })`.
- `acByProject = await actualCost.computeBatch(ids)`.
- progress: reuse the same approach as `EarnedValueService` — `workPackageProgress.groupBy({ by:['workPackageId'], _max:{ physicalProgress:true } })`, filter to the project's work packages, average per project (0 if none).
- Per project: `ev = bac * progress/100`; `cpi = ac > 0 ? ev/ac : null`; `spi = pv > 0 ? ev/pv : null`; `hasEvm = pv > 0 || bac > 0`; `eac = cpi != null && cpi > 0 ? bac/cpi : bac`; `vac = bac - eac`; `tcpi = (bac - ac) > 0 ? (bac - ev)/(bac - ac) : null`. Round to 2 decimals (ratios to 4).
- Totals: sum bac/ev/pv/ac; totals.cpi = `acTotal>0 ? evTotal/acTotal : null`; totals.spi = `pvTotal>0 ? evTotal/pvTotal : null`; totals.eac/vac from totals.
- Return `{ items, totals, generatedAt }`.

- [ ] **Step 4: Wire controller + module**

`project.controller.ts`: add `@Get('portfolio/evm') @Permissions(Permission.ProjectView) portfolioEvm(@Query() query: PortfolioFilterParams)` → `this.portfolioEvmSvc.portfolioEvm(query)`. Inject `PortfolioEvmService`.
`project.module.ts`: add `PortfolioEvmService` to `providers`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- portfolio-evm`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/project/application/services/portfolio-evm.service.ts apps/api/src/modules/project/application/services/portfolio-evm.service.spec.ts apps/api/src/modules/project/presentation/controllers/project.controller.ts apps/api/src/modules/project/project.module.ts
git commit -m "feat(project): portfolio EVM rollup endpoint"
```

---

## Task 4: `LiquidityPanel` widget

**Files:**
- Create: `apps/web/src/widgets/liquidity-panel/liquidity-panel.tsx`
- Create: `apps/web/src/widgets/liquidity-panel/index.ts`
- Test: `apps/web/src/widgets/liquidity-panel/liquidity-panel.test.tsx`

**Interfaces:**
- Consumes: `useCashPosition()` (`@/features/treasury`), `useCashFlow`, `useAging` (`@/features/analytics`), `Sparkline` (Task 1), `BulletBar`.
- Produces: `computeRunway(cashOnHand: number, monthlyBurn: number): number | null`; `workingCapitalGap(ar: number, ap: number): number`; `LiquidityPanelView({ cashOnHand, burnSeries, ar, ap, runwayMonths })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/liquidity-panel/liquidity-panel.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { computeRunway, workingCapitalGap, LiquidityPanelView } from './liquidity-panel';

describe('computeRunway', () => {
  it('divides cash by monthly burn', () => {
    expect(computeRunway(600, 100)).toBe(6);
  });
  it('returns null when burn is zero or negative', () => {
    expect(computeRunway(600, 0)).toBeNull();
    expect(computeRunway(600, -5)).toBeNull();
  });
});

describe('workingCapitalGap', () => {
  it('is AR minus AP', () => {
    expect(workingCapitalGap(4100, 2600)).toBe(1500);
  });
});

describe('LiquidityPanelView', () => {
  it('renders cash on hand, runway and gap labels', () => {
    render(<LiquidityPanelView cashOnHand={18240500000} burnSeries={[3, 4, 5]} ar={4100} ap={2600} runwayMonths={6.4} />);
    expect(screen.getByText(/cash on hand/i)).toBeTruthy();
    expect(screen.getByText(/6\.4/)).toBeTruthy();
  });

  it('renders empty-safe when all values are zero', () => {
    render(<LiquidityPanelView cashOnHand={0} burnSeries={[]} ar={0} ap={0} runwayMonths={null} />);
    expect(screen.getByText(/cash on hand/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- liquidity-panel`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement pure helpers + view + connected panel**

`computeRunway(cash, burn)` → `burn > 0 ? Math.round((cash/burn)*10)/10 : null`.
`workingCapitalGap(ar, ap)` → `ar - ap`.
`LiquidityPanelView`: overline "Liquidity"; `Sparkline values={burnSeries} label="Burn trend"`; runway line `≈ {runwayMonths} months runway` (or "—" when null); two `BulletBar`s for AR (`success-500`) and AP (`warning-500`) with values via `formatIdr`; gap line coloured by sign. Card container `rounded-md border border-neutral-200 bg-white p-4 shadow-xs`.
`LiquidityPanel({ filter })`: reads `useCashPosition()`, `useCashFlow(filter)`, `useAging(filter)`; `cashOnHand = cashPosition.data?.totalBalance ?? 0`; burn series = last 3 months of `|net|` from cash flow; `ar`/`ap` = sums of aging buckets; computes runway and gap; renders view.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- liquidity-panel`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/liquidity-panel/
git commit -m "feat(web): Liquidity panel (cash on hand, runway, AR/AP gap)"
```

---

## Task 5: Hero Band — Cash on Hand + Net Cash Flow

**Files:**
- Modify: `apps/web/src/widgets/hero-band/hero-band.tsx`
- Modify: `apps/web/src/widgets/hero-band/hero-band.test.tsx`

**Interfaces:**
- Consumes: `useCashPosition` (`@/features/treasury`), `useExecutiveDashboard`, `usePortfolio` (filter), `StatCard`.
- Produces: `heroNarrative({ cashOnHand, netCashFlow, criticalProjects, openNcrs })` → string.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/hero-band/hero-band.test.tsx
import { describe, expect, it } from 'vitest';
import { heroNarrative } from './hero-band';

describe('heroNarrative', () => {
  it('states cash on hand, net flow direction, critical projects and open NCRs', () => {
    const text = heroNarrative({ cashOnHand: 18240500000, netCashFlow: 420000000, criticalProjects: 3, openNcrs: 2 });
    expect(text).toMatch(/cash on hand/i);
    expect(text).toMatch(/positive/i);
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  it('says negative flow when net cash flow is below zero', () => {
    expect(heroNarrative({ cashOnHand: 0, netCashFlow: -5, criticalProjects: 0, openNcrs: 0 })).toMatch(/negative/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- hero-band`
Expected: FAIL — `heroNarrative` signature changed.

- [ ] **Step 3: Implement**

`heroNarrative({ cashOnHand, netCashFlow, criticalProjects, openNcrs })` → `Cash on hand ${formatIdr(cashOnHand)}; net cash flow ${netCashFlow >= 0 ? 'positive' : 'negative'}; ${criticalProjects} critical project(s); ${openNcrs} open NCR(s).` (Import `formatIdr`.)
`HeroBand({ filter })`: overline **"CASH ON HAND · bank balances"**; value = `useCashPosition().data?.totalBalance ?? 0` in `text-display font-mono tabular-nums`, `financial-positive-600`/`-negative-600`; a second line **"Net cash flow · period"** = `cashIn − cashOut` (smaller, `h3`); narrative; three `StatCard`s (Contract, Budget "(baseline)", Actual "% of budget").

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- hero-band`
Expected: PASS (2 tests). Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/hero-band/
git commit -m "feat(web): Hero shows Cash on hand + net cash flow"
```

---

## Task 6: Portfolio Canvas → CPI × SPI

**Files:**
- Modify: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.tsx`
- Modify: `apps/web/src/widgets/portfolio-canvas/portfolio-canvas.test.tsx`
- Modify: `apps/web/src/features/project/model/project.api.ts`

**Interfaces:**
- Consumes: `usePortfolioEvm(filter)` (new hook, Task 6 step 3), `usePortfolio(filter)` for health/contract.
- Produces: `buildEvmPoints(portfolioItems, evmItems): EvmPoint[]` where `EvmPoint = { projectId; projectCode; projectName; cpi; spi; contract; health; hasEvm }`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/portfolio-canvas/portfolio-canvas.test.tsx
import { describe, expect, it } from 'vitest';
import { buildEvmPoints } from './portfolio-canvas';

const portfolio = [
  { projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', client: 'C', status: 'ACTIVE', contractValue: 100, budget: 0, actual: 0, revenue: 0, variance: 0, utilization: null, health: 'NO_BUDGET' as const },
  { projectId: 'p2', projectCode: 'PRJ-2', projectName: 'B', client: 'C', status: 'ACTIVE', contractValue: 200, budget: 100, actual: 120, revenue: 0, variance: -20, utilization: 120, health: 'CRITICAL' as const },
];
const evm = [
  { projectId: 'p1', projectCode: 'PRJ-1', projectName: 'A', bac: 0, ev: 0, pv: 0, ac: 0, cpi: null, spi: null, eac: 0, vac: 0, tcpi: null, progressPercent: 0, hasEvm: false },
  { projectId: 'p2', projectCode: 'PRJ-2', projectName: 'B', bac: 100, ev: 50, pv: 60, ac: 40, cpi: 1.25, spi: 0.83, eac: 80, vac: 20, tcpi: 1.1, progressPercent: 50, hasEvm: true },
];

describe('buildEvmPoints', () => {
  it('uses cpi/spi for projects with EVM data', () => {
    const p = buildEvmPoints(portfolio, evm).find((x) => x.projectId === 'p2')!;
    expect(p.cpi).toBe(1.25);
    expect(p.spi).toBe(0.83);
    expect(p.hasEvm).toBe(true);
  });

  it('marks projects without EVM as hasEvm:false with safe cpi/spi', () => {
    const p = buildEvmPoints(portfolio, evm).find((x) => x.projectId === 'p1')!;
    expect(p.hasEvm).toBe(false);
    expect(Number.isFinite(p.cpi)).toBe(true);
    expect(Number.isFinite(p.spi)).toBe(true);
  });

  it('keeps projects absent from the EVM response (hasEvm:false)', () => {
    const p = buildEvmPoints(portfolio, []).find((x) => x.projectId === 'p2')!;
    expect(p.hasEvm).toBe(false);
  });

  it('returns empty array for empty portfolio', () => {
    expect(buildEvmPoints([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- portfolio-canvas`
Expected: FAIL — `buildEvmPoints` not exported.

- [ ] **Step 3: Add `usePortfolioEvm` hook**

In `apps/web/src/features/project/model/project.api.ts`:

```ts
export function usePortfolioEvm(filter: DashboardFilter = {}) {
  return useQuery({
    queryKey: [...projectAnalyticsKeys.all, 'portfolio-evm', filter] as const,
    queryFn: async () => {
      const qs = filter.legalEntityId ? `?legalEntityId=${encodeURIComponent(filter.legalEntityId)}` : '';
      const data = await getJson<unknown>(`/projects/portfolio/evm${qs}`);
      return portfolioEvmSchema.parse(data);
    },
  });
}
```
Import `portfolioEvmSchema`.

- [ ] **Step 4: Implement `buildEvmPoints` + rewrite `PortfolioCanvas`**

`buildEvmPoints(portfolioItems, evmItems)`: join by `projectId`; `hasEvm = evm?.hasEvm ?? false`; `cpi = evm?.cpi ?? 1` when `hasEvm` else `1`; `spi = evm?.spi ?? 1` when `hasEvm` else `1` (safe finite defaults so absent data sits at the 1.0 crosshair); `contract`, `health` from the portfolio item.
`PortfolioCanvas`: `XAxis dataKey="cpi"`, `YAxis dataKey="spi"`, `ReferenceLine x={1}` and `y={1}`; `Cell` fill by health; projects with `hasEvm:false` get `fill="#a1a1aa"` and `fillOpacity={0.4}`; tooltip shows CPI, SPI, contract, and "no EVM data" when false; click → `/project-health?project={id}`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- portfolio-canvas`
Expected: PASS (4 tests). Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/portfolio-canvas/ apps/web/src/features/project/model/project.api.ts
git commit -m "feat(web): portfolio canvas plots CPI x SPI"
```

---

## Task 7: Portfolio Spine — EVM column + richer cells

**Files:**
- Modify: `apps/web/src/widgets/portfolio-spine/portfolio-spine.tsx`
- Modify: `apps/web/src/widgets/portfolio-spine/portfolio-spine.test.tsx`

**Interfaces:**
- Consumes: `usePortfolioEvm(filter)` (Task 6).
- Produces: `evmColumn(evmByProject: Map<string, PortfolioEvmItem>)` helper; `portfolioColumns` gains an `evm` column.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/portfolio-spine/portfolio-spine.test.tsx
import { describe, expect, it } from 'vitest';
import { portfolioColumns } from './portfolio-spine';

describe('portfolioColumns', () => {
  it('includes the EVM column alongside the visual columns', () => {
    const ids = portfolioColumns.map(
      (c) => (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey,
    );
    for (const key of ['projectCode', 'client', 'health', 'utilization', 'budgetVsActual', 'variance', 'revenue', 'margin', 'evm']) {
      expect(ids).toContain(key);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- portfolio-spine`
Expected: FAIL — no `evm` column.

- [ ] **Step 3: Implement**

Add an `evm` display column: for each row, look up the EVM item (pass a `Map` via the `PortfolioSpine` closure or read from a `usePortfolioEvm` inside the component and build the map, then render columns with a factory `makePortfolioColumns(evmMap)`). Cell shows `CPI {cpi.toFixed(2)} · SPI {spi.toFixed(2)}` in `font-mono text-caption`, coloured per value (≥1 `success-700`, <1 `destructive-600`), or `—` when `!hasEvm`. Keep existing visual columns (bullet bar, stacked bar, margin chip). Update the test to also cover a row rendering "—" for a project without EVM.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- portfolio-spine`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/portfolio-spine/
git commit -m "feat(web): portfolio spine gains EVM column"
```

---

## Task 8: Financial Band — segmented aging + budget burn

**Files:**
- Modify: `apps/web/src/widgets/financial-band/financial-band.tsx`
- Modify: `apps/web/src/widgets/financial-band/financial-band.test.tsx`

**Interfaces:**
- Consumes: `useAging(filter)`, `useCashFlow(filter)`, `usePortfolio(filter)`, `AgingBar`, `BulletBar`.
- Produces: `agingSegments(buckets)` (exists), plus `hasOutstanding(buckets): boolean`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/financial-band/financial-band.test.tsx
import { describe, expect, it } from 'vitest';
import { hasOutstanding } from './financial-band';

describe('hasOutstanding', () => {
  it('is false when every bucket is zero', () => {
    expect(hasOutstanding([{ bucket: 'CURRENT', amount: 0 }, { bucket: '90+', amount: 0 }])).toBe(false);
  });
  it('is true when any bucket has value', () => {
    expect(hasOutstanding([{ bucket: 'CURRENT', amount: 0 }, { bucket: '1-30', amount: 5 }])).toBe(true);
  });
  it('is false for an empty list', () => {
    expect(hasOutstanding([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- financial-band`
Expected: FAIL — `hasOutstanding` not exported.

- [ ] **Step 3: Implement**

`hasOutstanding(buckets)` → `buckets.some((b) => b.amount > 0)`. In the AR/AP blocks, when `!hasOutstanding`, render `<p>No outstanding {label}.</p>` instead of `AgingBar`. Keep cash flow chart and budget burn; ensure `BulletBar value={actual} max={budget}` guards `budget = 0`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- financial-band`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/financial-band/
git commit -m "feat(web): financial band empty-safe aging"
```

---

## Task 9: Signal Rail — real filtering deep-links

**Files:**
- Modify: `apps/web/src/widgets/signal-rail/signal-rail.tsx`
- Modify: `apps/web/src/widgets/signal-rail/signal-rail.test.tsx`
- Modify: `apps/web/src/pages/quality/quality.page.tsx`
- Modify: `apps/web/src/pages/hse/hse.page.tsx`

**Interfaces:**
- Produces: deep-links carrying filter params, e.g. `/quality?tab=ncrs&status=OPEN`, `/hse?tab=incidents&status=OPEN`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/widgets/signal-rail/signal-rail.test.tsx  (add case)
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildSignals } from './signal-rail';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe('buildSignals deep-links', () => {
  it('NCR signal filters by OPEN status', () => {
    const s = buildSignals({ openNcrs: 2, openIncidents: 0, overduePm: 0, openPunchItems: 0, openClaims: 0, pendingApprovals: 0, overdueAr: 0, anomalies: { high: 0, medium: 0, low: 0 } });
    expect(s.find((x) => x.key === 'ncrs')!.to).toBe('/quality?tab=ncrs&status=OPEN');
  });
  it('incident signal filters by OPEN status', () => {
    const s = buildSignals({ openNcrs: 0, openIncidents: 1, overduePm: 0, openPunchItems: 0, openClaims: 0, pendingApprovals: 0, overdueAr: 0, anomalies: { high: 0, medium: 0, low: 0 } });
    expect(s.find((x) => x.key === 'incidents')!.to).toBe('/hse?tab=incidents&status=OPEN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- signal-rail`
Expected: FAIL — deep-links lack `&status=OPEN`.

- [ ] **Step 3: Update deep-links + target pages**

`signal-rail.tsx`: change ncrs → `/quality?tab=ncrs&status=OPEN`; incidents → `/hse?tab=incidents&status=OPEN`; punch → `/quality?tab=punch&status=OPEN`; claims → `/finance/progress-claims?status=DRAFT`.
`quality.page.tsx`: read `status` via `useUrlFilter('status')` and pass to `useNcrs({ ..., status })` / `usePunchItems({ ..., status })` (confirm the hooks accept `status`; `useNcrs` does — Task 3 of Phase A noted `status`+`severity` params). If `usePunchItems` lacks `status`, add it to the hook + API query.
`hse.page.tsx`: read `status` and pass to `useIncidents({ ..., status })`; add `status` support to `useIncidents` if missing.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- signal-rail`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/signal-rail/ apps/web/src/pages/quality/quality.page.tsx apps/web/src/pages/hse/hse.page.tsx apps/web/src/features/quality apps/web/src/features/hse
git commit -m "feat(web): signal rail deep-links filter by status"
```

---

## Task 10: Wire LiquidityPanel into the dashboard

**Files:**
- Modify: `apps/web/src/pages/dashboard.page.tsx`
- Modify: `apps/web/src/pages/dashboard.page.test.tsx`

**Interfaces:**
- Consumes: `LiquidityPanel` (Task 4).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/pages/dashboard.page.test.tsx  (add mock + assertion)
vi.mock('@/widgets/liquidity-panel', () => ({ LiquidityPanel: () => <div data-testid="liquidity" /> }));
```
and in the existing test, add `expect(screen.getByTestId('liquidity')).toBeTruthy();` to the zone assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- dashboard.page`
Expected: FAIL — `liquidity` testid absent.

- [ ] **Step 3: Implement**

In `dashboard.page.tsx`, change the bands grid: Hero takes `xl:col-span-7`, and the right column renders `<LiquidityPanel filter={filter} />` **above** `<FinancialBand filter={filter} />` (or split: Hero left, Liquidity right-top). Keep 5-zone structure and staggered reveal. Import `LiquidityPanel`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- dashboard.page`
Expected: PASS. Then `pnpm --filter @aec/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/dashboard.page.tsx apps/web/src/pages/dashboard.page.test.tsx
git commit -m "feat(web): dashboard wires Liquidity panel"
```

---

## Task 11: i18n leftover sweep

**Files:**
- Modify: any web file still containing Indonesian user-facing strings (e.g. `apps/web/src/pages/quality/quality.page.tsx` `'Inspeksi'`, `'Buat Baru'`).

**Interfaces:** none.

- [ ] **Step 1: Find leftovers**

Run: `pnpm --filter @aec/web exec rg -n "Inspeksi|Buat|Belum|Tutup|Muat|Kembali|Distribusi|Utilisasi|Klien|Jumlah|Tidak|Cari|Simpan|Hapus|Ubah|Tambah" apps/web/src`
Expected: a list of files with Indonesian UI strings (comments excluded by inspection).

- [ ] **Step 2: Replace each user-facing string with English**

Translate only `message:`/JSX text/`aria-label`/`placeholder`/`emptyMessage`. Leave code comments and `Rp`/`id-ID` formatting untouched.

- [ ] **Step 3: Verify no user-facing Indonesian remains**

Re-run the rg from Step 1, inspecting each hit is a comment only.
Expected: remaining hits are code comments.

- [ ] **Step 4: Run web tests + typecheck**

Run: `pnpm --filter @aec/web test` then `pnpm --filter @aec/web typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "fix(i18n): sweep remaining Indonesian UI strings"
```

---

## Task 12: Whole-suite verification

**Files:** none.

- [ ] **Step 1: Typecheck** — `pnpm typecheck` → `Tasks: 10 successful`.
- [ ] **Step 2: Lint** — `pnpm lint` → `Tasks: 6 successful`.
- [ ] **Step 3: API unit** — `pnpm --filter @aec/api test:unit` → all pass.
- [ ] **Step 4: Web tests** — `pnpm --filter @aec/web test` → all pass.
- [ ] **Step 5: Manual smoke** — start Postgres+Redis, override `DATABASE_URL`, run API + web, log in `admin@aec.local / Admin123!`, confirm: hero shows cash on hand; canvas plots CPI×SPI with grey no-data markers; table shows EVM column; liquidity panel shows runway; signal deep-links filter the target list.
- [ ] **Step 6: Commit any fixes, then push** — `git push -u origin feat/dashboard-phase-b`.

---

## Self-Review Notes

- **Spec coverage:** two-cash-metrics → Tasks 4, 5; EVM rollup → Tasks 2, 3; EVM as additional indicator (health untouched) → Tasks 6, 7; working-capital gap → Task 4; segmented aging → Task 8; real drill-down → Task 9; visual enrichment within design system → Tasks 1, 6, 7; i18n → Task 11; verification → Task 12.
- **Deferred to Phase C:** cross-filter linked views, delta period (MoM/YoY), anomaly triage, urgency/SLA ages, saved views, ⌘K. **Phase D:** keyboard-first, filtered export.
- **Risk:** `/projects/portfolio/evm` reuses `workPackageProgress` aggregation; if a project has work packages but no control accounts, `pv = 0` → `spi = null` and `hasEvm` false when `bac` is also 0 — covered by Task 3 tests.
- **Type consistency:** `PortfolioEvmItem` defined once (Task 2) and consumed in Tasks 3, 6, 7; `DashboardFilter` reused from Phase A.

