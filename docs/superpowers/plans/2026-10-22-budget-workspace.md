# Budget Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the flat Budget table into an allocation workspace: WBS tree with computed rollups, cost-type composition per node, real per-WBS spend, and sanity warnings.

**Architecture:** No new tables. The dimension columns (`BudgetItem.costType`, `StockLedgerEntry.wbsItemId`, `JournalLine.wbsItemId`) already exist and are simply never populated or exposed. The contract gains rollup and per-cost-type fields additively; `BudgetService.findAll` assembles the tree and computes rollups in memory from three aggregates; the UI renders a tree plus an inspector with a stacked allocation bar.

**Tech Stack:** NestJS + Prisma (PostgreSQL), Zod contracts in `@aec/api-contracts`, React 18 + TanStack Query + Tailwind, Vitest (web), Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-22-budget-workspace-design.md`

## Global Constraints

- No changes to `apps/api/prisma/schema.prisma`. All needed columns exist.
- `upsertBudgetSchema.costType` becomes **required**; a request without it must fail `400`, never fall back to `'DIRECT'`.
- `budgetSummarySchema.totalBudget` and existing `wbs[].budget`/`itemCount` keys must keep working (additive contract change only).
- Publishing an already-published budget must keep returning `409 BUDGET_PUBLISHED`.
- Per-WBS `used` = `SUM(ABS(totalValue))` of `StockLedgerEntry` with `movementType='OUT'` for that WBS **plus** `JournalLine.debit` for accounts whose `code` starts with `610`. Never allocate spend across WBS nodes that have no matching ledger/journal rows.
- Rollups are computed at query time; no stored rollup columns.
- Text contrast ≥ 4.5:1. Do not use `text-neutral-400` for text. Stacked bars must carry a text `aria-label`, not colour alone.
- UI copy is English, matching the rest of the app.

## Review Focus

- A WBS node with no budget rows and no spend must render `0`, not `NaN`, not blank, and not `Infinity` in the utilisation percentage (division by zero).
- A project with zero WBS rows must render an empty state, not a crash.
- A WBS tree with a child whose `parentId` points at a missing row must still render that child as a root rather than disappearing.
- A stacked bar with one cost type at `0` must not render a zero-width coloured segment that still occupies border/padding space.
- Spending that exceeds budget must show utilisation above 100% and a `remaining` that is negative — it must not clamp silently to 100%.

---

### Task 1: Cost-type contract and required `costType`

**Files:**
- Modify: `packages/api-contracts/src/project.ts:415-433`
- Test: `apps/api/src/modules/project/application/services/budget-contracts.spec.ts` (create)

> Contract tests live in `apps/api/src/**/*-contracts.spec.ts` and run under Jest —
> that is the established pattern (`analytics-contracts.spec.ts`,
> `hardening-contracts.spec.ts`, `legal-entity-contracts.spec.ts`). The
> `@aec/api-contracts` package has no test runner of its own; do not add one.

**Interfaces:**
- Consumes: nothing.
- Produces: `costTypeKeySchema` (`z.enum(['DIRECT','LABOR','MATERIAL','SUBCONTRACTOR','EQUIPMENT','INDIRECT','OVERHEAD'])`), `CostTypeKey` type, `budgetSummarySchema` with `wbs[].depth|used|remaining|byCostType|plannedValue|childrenCount`, `totals`, `warnings`, `costCoverage`; `upsertBudgetSchema.costType` required.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/project/application/services/budget-contracts.spec.ts
import { budgetSummarySchema, upsertBudgetSchema } from '@aec/api-contracts';

describe('upsertBudgetSchema', () => {
  it('requires costType instead of defaulting to DIRECT', () => {
    expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', amount: 100 }).success).toBe(false);
    expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }).success).toBe(true);
  });

  it('rejects an unknown cost type', () => {
    expect(upsertBudgetSchema.safeParse({ wbsItemId: 'w1', costType: 'NOPE', amount: 1 }).success).toBe(false);
  });
});

describe('budgetSummarySchema', () => {
  it('accepts a node with rollup, cost breakdown and spend', () => {
    const parsed = budgetSummarySchema.parse({
      projectId: 'p1',
      status: 'PUBLISHED',
      wbs: [{
        id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0,
        budget: 1000, used: 400, remaining: 600,
        byCostType: { LABOR: 600, MATERIAL: 400 },
        plannedValue: 0, itemCount: 2, childrenCount: 0,
      }],
      totalBudget: 1000,
      totals: { budget: 1000, used: 400, remaining: 600, contractValue: 1200, variance: 200 },
      warnings: { overContract: false, overAllocated: [], noBudget: [], pvMismatch: null },
      costCoverage: { allocatedNodes: 1, totalNodes: 1 },
    });
    expect(parsed.wbs[0].used).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- budget-contracts`
Expected: FAIL — `costType` currently optional so the first assertion fails.

- [ ] **Step 3: Extend the contract**

In `packages/api-contracts/src/project.ts`, add above `budgetSummarySchema`:

```ts
export const costTypeKeySchema = z.enum([
  'DIRECT', 'LABOR', 'MATERIAL', 'SUBCONTRACTOR', 'EQUIPMENT', 'INDIRECT', 'OVERHEAD',
]);
export type CostTypeKey = z.infer<typeof costTypeKeySchema>;
```

Replace the `wbs` array element and the trailing keys of `budgetSummarySchema` so each node is:

```ts
wbs: z.array(
  z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    parentId: z.string().nullable(),
    depth: z.number(),
    budget: z.number(),
    used: z.number(),
    remaining: z.number(),
    byCostType: z.record(costTypeKeySchema, z.number()),
    plannedValue: z.number(),
    itemCount: z.number(),
    childrenCount: z.number(),
  }),
),
totalBudget: z.number(),
totals: z.object({
  budget: z.number(),
  used: z.number(),
  remaining: z.number(),
  contractValue: z.number(),
  variance: z.number(),
}),
warnings: z.object({
  overContract: z.boolean(),
  overAllocated: z.array(z.object({ wbsId: z.string(), code: z.string(), amount: z.number() })),
  noBudget: z.array(z.object({ wbsId: z.string(), code: z.string() })),
  pvMismatch: z.object({ pv: z.number(), bac: z.number(), ratio: z.number() }).nullable(),
}),
costCoverage: z.object({ allocatedNodes: z.number(), totalNodes: z.number() }),
```

Then change `upsertBudgetSchema` so `costType` is `costTypeKeySchema` (required, no `.optional()`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- budget-contracts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/project.ts apps/api/src/modules/project/application/services/budget-contracts.spec.ts
git commit -m "feat(budget): expose cost-type and rollup fields in the contract"
```

---

### Task 2: Pure tree builder and warning collector

**Files:**
- Create: `apps/api/src/modules/project/application/services/budget-tree.ts`
- Test: `apps/api/src/modules/project/application/services/budget-tree.spec.ts`

**Interfaces:**
- Consumes: nothing (pure functions, no Prisma).
- Produces:
  - `type BudgetNodeInput = { id: string; code: string; name: string; parentId: string | null }`
  - `type BudgetRowInput = { wbsItemId: string; costType: CostTypeKey; amount: number }`
  - `type SpendInput = { wbsItemId: string; amount: number }`
  - `buildBudgetTree(nodes: BudgetNodeInput[], rows: BudgetRowInput[], spend: SpendInput[], pvByWbs: Map<string, number>): BudgetTreeNode[]` where `BudgetTreeNode` has the shape of `budgetSummarySchema['wbs'][number]` plus `children: BudgetTreeNode[]`.
  - `collectWarnings(totals: { budget: number; used: number; contractValue: number }, nodes: BudgetTreeNode[], pv: number): BudgetSummary['warnings']`

- [ ] **Step 1: Write the failing test**

```ts
// budget-tree.spec.ts
import { describe, expect, it } from 'vitest';
import { buildBudgetTree, collectWarnings } from './budget-tree';

const node = (id: string, code: string, parentId: string | null = null) => ({ id, code, name: `n${id}`, parentId });

describe('buildBudgetTree', () => {
  it('rolls child budget and spend up to the parent', () => {
    const tree = buildBudgetTree(
      [node('p', '1'), node('c1', '1.1', 'p'), node('c2', '1.2', 'p')],
      [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
      [{ wbsItemId: 'c1', amount: 40 }],
      new Map(),
    );
    const parent = tree[0];
    expect(parent.budget).toBe(400);
    expect(parent.used).toBe(40);
    expect(parent.remaining).toBe(360);
    expect(parent.byCostType).toEqual({ LABOR: 100, MATERIAL: 300 });
    expect(parent.childrenCount).toBe(2);
    expect(parent.depth).toBe(0);
    expect(parent.children[0].depth).toBe(1);
  });

  it('treats an orphan as a root instead of dropping it', () => {
    const tree = buildBudgetTree([node('x', '9', 'missing-parent')], [], [], new Map());
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('x');
  });

  it('reports zero spend rather than NaN when a node has no budget', () => {
    const tree = buildBudgetTree([node('a', '1')], [], [], new Map());
    expect(tree[0].budget).toBe(0);
    expect(tree[0].used).toBe(0);
    expect(tree[0].remaining).toBe(0);
    expect(Number.isNaN(tree[0].remaining)).toBe(false);
  });
});

describe('collectWarnings', () => {
  it('flags a total above the contract value', () => {
    const tree = buildBudgetTree([node('a', '1')], [{ wbsItemId: 'a', costType: 'LABOR', amount: 500 }], [], new Map());
    const w = collectWarnings({ budget: 500, used: 0, contractValue: 400 }, tree, 0);
    expect(w.overContract).toBe(true);
  });

  it('lists nodes without budget and nodes over-allocated', () => {
    const tree = buildBudgetTree(
      [node('a', '1'), node('b', '2')],
      [{ wbsItemId: 'b', costType: 'LABOR', amount: 900 }],
      [{ wbsItemId: 'b', amount: 950 }],
      new Map(),
    );
    const w = collectWarnings({ budget: 900, used: 950, contractValue: 5000 }, tree, 0);
    expect(w.noBudget.map((n) => n.code)).toEqual(['1']);
    expect(w.overAllocated.map((n) => n.code)).toEqual(['2']);
  });

  it('flags a PV that does not match BAC', () => {
    const tree = buildBudgetTree([node('a', '1')], [{ wbsItemId: 'a', costType: 'LABOR', amount: 1000 }], [], new Map());
    const w = collectWarnings({ budget: 1000, used: 0, contractValue: 5000 }, tree, 600);
    expect(w.pvMismatch).not.toBeNull();
    expect(w.pvMismatch!.ratio).toBeCloseTo(0.6, 2);
  });

  it('reports no mismatch when PV equals BAC', () => {
    const tree = buildBudgetTree([node('a', '1')], [{ wbsItemId: 'a', costType: 'LABOR', amount: 1000 }], [], new Map());
    expect(collectWarnings({ budget: 1000, used: 0, contractValue: 5000 }, tree, 1000).pvMismatch).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- budget-tree`
Expected: FAIL — module `./budget-tree` not found.

- [ ] **Step 3: Implement `budget-tree.ts`**

Two passes. First index nodes by id and sum `rows` into `budgetByNode` (a `Record<CostTypeKey, number>`) and `spend` into `usedByNode`. Second, resolve `depth` by walking `parentId` upward with a visited set so a cycle cannot hang; treat an unresolvable parent as `null` (root). Third, attach children and accumulate each node's own totals into every ancestor, so `budget`, `used`, `byCostType` and `remaining` on a parent are the sum over its subtree. `remaining = budget - used` and must be allowed to go negative. `collectWarnings` walks the flattened tree: `overContract` when `budget > contractValue`; `noBudget` for nodes whose own `budget === 0` **and** `childrenCount === 0`; `overAllocated` for nodes whose own `used > budget` and `budget > 0`; `pvMismatch` when `bac > 0` and `Math.abs(pv / bac - 1) > 0.01`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- budget-tree`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/budget-tree.ts apps/api/src/modules/project/application/services/budget-tree.spec.ts
git commit -m "feat(budget): pure tree builder with rollup and warnings"
```

---

### Task 3: Wire the service to the tree builder

**Files:**
- Modify: `apps/api/src/modules/project/application/services/budget.service.ts`
- Modify: `apps/api/src/modules/project/presentation/dto/budget.dto.ts`
- Test: `apps/api/src/modules/project/application/services/budget.service.spec.ts` (create)

**Interfaces:**
- Consumes: `buildBudgetTree`, `collectWarnings` from Task 2; `costTypeKeySchema` from Task 1.
- Produces: `BudgetService.findAll(projectId)` returning the full `budgetSummarySchema` shape; `BudgetService.upsert(projectId, dto, actorId)` unchanged in signature, but rejects a missing `costType` with `BadRequestException({ code: 'COST_TYPE_REQUIRED' })`.

- [ ] **Step 1: Write the failing test**

```ts
// budget.service.spec.ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { BudgetService } from './budget.service';

const prisma = {
  project: { findUnique: jest.fn() },
  wbsItem: { findMany: jest.fn(), findUnique: jest.fn() },
  budgetItem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  stockLedgerEntry: { groupBy: jest.fn() },
  journalLine: { groupBy: jest.fn() },
  controlAccount: { groupBy: jest.fn() },
};
const audit = { record: jest.fn() };
const cache = {};
const make = () => new BudgetService(prisma as never, audit as never, cache as never);

beforeEach(() => jest.clearAllMocks());

describe('findAll', () => {
  it('returns spend per WBS, cost breakdown, totals and warnings', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000 });
    prisma.wbsItem.findMany.mockResolvedValue([
      { id: 'w1', code: '1', name: 'Engineering', parentId: null },
    ]);
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
    ]);
    prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
    prisma.journalLine.groupBy.mockResolvedValue([]);
    prisma.controlAccount.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { plannedValue: 600 } }]);

    const res = await make().findAll('p1');
    expect(res.wbs[0].budget).toBe(1000);
    expect(res.wbs[0].used).toBe(400);
    expect(res.wbs[0].byCostType).toEqual({ LABOR: 1000 });
    expect(res.totals.contractValue).toBe(5000);
    expect(res.warnings.pvMismatch?.ratio).toBeCloseTo(0.6, 2);
    expect(res.costCoverage).toEqual({ allocatedNodes: 1, totalNodes: 1 });
  });

  it('throws PROJECT_NOT_FOUND for an unknown project', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(make().findAll('nope')).rejects.toMatchObject({ response: { code: 'PROJECT_NOT_FOUND' } });
  });
});

describe('upsert', () => {
  it('rejects a missing cost type instead of writing DIRECT', async () => {
    await expect(make().upsert('p1', { wbsItemId: 'w1', amount: 10 } as never, 'u1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates the existing row for the same cost type', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.wbsItem.findUnique.mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' });
    prisma.budgetItem.findUnique.mockResolvedValue({ id: 'b1', status: 'DRAFT' });
    prisma.budgetItem.upsert.mockResolvedValue({ id: 'b1' });
    await make().upsert('p1', { wbsItemId: 'w1', costType: 'LABOR', amount: 10 }, 'u1');
    expect(prisma.budgetItem.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId_wbsItemId_costType: { projectId: 'p1', wbsItemId: 'w1', costType: 'LABOR' } },
    }));
  });

  it('keeps refusing to edit a published budget', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.wbsItem.findUnique.mockResolvedValue({ id: 'w1', projectId: 'p1', code: '1' });
    prisma.budgetItem.findUnique.mockResolvedValue({ id: 'b1', status: 'PUBLISHED' });
    await expect(make().upsert('p1', { wbsItemId: 'w1', costType: 'LABOR', amount: 10 }, 'u1'))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api test:unit -- budget.service`
Expected: FAIL — spec file has no matching implementation (missing aggregates, missing `COST_TYPE_REQUIRED`).

- [ ] **Step 3: Implement the service changes**

In `budget.dto.ts`, change `costType` to required: replace `@IsOptional()` + `@IsEnum([...])` with `@IsEnum([...])` and type it `string`.

In `budget.service.ts`:

1. Guard at the top of `upsert`: if `!dto.costType` throw `new BadRequestException({ code: 'COST_TYPE_REQUIRED', message: 'costType is required' })`.
2. Remove `const costType = dto.costType ?? 'DIRECT'` and use `dto.costType` directly.
3. Rewrite `findAll` to fetch in one `Promise.all`: `wbsItem.findMany` (select `id, code, name, parentId`, order `sortOrder, code`), `budgetItem.findMany` (select `wbsItemId, costType, amount, status, version`), `stockLedgerEntry.groupBy({ by: ['wbsItemId'], where: { projectId, movementType: 'OUT', wbsItemId: { not: null } }, _sum: { totalValue: true } })`, `journalLine.groupBy({ by: ['wbsItemId'], where: { wbsItemId: { not: null }, journal: { projectId, status: 'POSTED' }, account: { code: { startsWith: '610' } } }, _sum: { debit: true } })`, `controlAccount.groupBy({ by: ['wbsItemId'], where: { projectId }, _sum: { plannedValue: true } })`.
4. Map the ledger aggregate with `Math.abs(Number(_sum.totalValue ?? 0))` and add the journal debit sum for the same `wbsItemId` into one `spend` array.
5. Call `buildBudgetTree(nodes, rows, spend, pvByWbs)`; derive `totals` from the roots (`sum` of root `budget`/`used`), `contractValue` from the project, `variance = contractValue - budget`, and `costCoverage.allocatedNodes` = number of nodes with `used > 0`.
6. Return `{ projectId, status, wbs, totalBudget: totals.budget, totals, warnings, costCoverage }`. Flatten `children` into the returned `wbs` array (each node keeps its own `depth`), because the contract is a flat list.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api test:unit -- budget.service`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/budget.service.ts \
        apps/api/src/modules/project/application/services/budget.service.spec.ts \
        apps/api/src/modules/project/presentation/dto/budget.dto.ts
git commit -m "feat(budget): roll up WBS tree, spend per node, and sanity warnings"
```

---

### Task 4: Fill the WBS dimension in seed and backfill existing rows

**Files:**
- Modify: `apps/api/prisma/seed-demo.ts:592-597` (ledger writes) and the material journal line near `:1306`
- Create: `apps/api/prisma/migrations/20261022_backfill_wbs_dimension/migration.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `StockLedgerEntry.wbsItemId` and `JournalLine.wbsItemId` populated for material movement and material expense rows.

- [ ] **Step 1: Add `wbsItemId` to the ledger writes in the seed**

In the `seedPortfolio` loop, resolve the material WBS once per project and pass it to every ledger write:

```ts
const materialWbs = await prisma.wbsItem.findFirst({ where: { projectId: project.id, code: '2' }, select: { id: true } });
const materialWbsId = materialWbs?.id ?? null;
```

Add `wbsItemId: materialWbsId` to the three `stockLedgerEntry.create` calls (GR, ISSUE, ADJUSTMENT). In the material journal near `:1306`, add `wbsItemId: materialWbsId` to the `6100` debit line only.

- [ ] **Step 2: Write the backfill migration**

```sql
-- Backfill WBS dimension for material movements and material expense lines.
-- Idempotent: only touches rows whose dimension is still NULL.
UPDATE "StockLedgerEntry" sle
SET "wbsItemId" = w.id
FROM "WbsItem" w
WHERE sle."wbsItemId" IS NULL
  AND w."projectId" = sle."projectId"
  AND w."code" = '2';

UPDATE "JournalLine" jl
SET "wbsItemId" = w.id
FROM "Journal" j, "ChartOfAccount" a, "WbsItem" w
WHERE jl."wbsItemId" IS NULL
  AND jl."journalId" = j.id
  AND jl."accountId" = a.id
  AND a."code" LIKE '610%'
  AND w."projectId" = jl."projectId"
  AND w."code" = '2';
```

- [ ] **Step 3: Apply and verify on the VPS**

Run on the VPS: `pnpm --filter @aec/api exec prisma migrate deploy`

Then verify (expect non-zero on both):

```sql
SELECT 'ledger_with_wbs=' || count(*) FILTER (WHERE "wbsItemId" IS NOT NULL) || '/' || count(*) FROM "StockLedgerEntry";
SELECT 'journal_with_wbs=' || count(*) FILTER (WHERE "wbsItemId" IS NOT NULL) || '/' || count(*) FROM "JournalLine";
```

Expected: `ledger_with_wbs` ≥ 29/29 and `journal_with_wbs` ≥ 1/8 (only the 610 line gains a dimension; the rest have no material account and stay NULL by design).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed-demo.ts apps/api/prisma/migrations/20261022_backfill_wbs_dimension
git commit -m "feat(budget): populate the WBS dimension for material cost"
```

---

### Task 5: Stacked cost-type bar

**Files:**
- Create: `apps/web/src/features/project/ui/cost-type-bar.tsx`
- Test: `apps/web/src/features/project/ui/cost-type-bar.test.tsx`

**Interfaces:**
- Consumes: `CostTypeKey` from `@aec/api-contracts`.
- Produces: `CostTypeBar({ byCostType, total, usedPercent }: { byCostType: Partial<Record<CostTypeKey, number>>; total: number; usedPercent: number | null })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostTypeBar } from './cost-type-bar';

describe('CostTypeBar', () => {
  it('renders one segment per non-zero cost type', () => {
    render(<CostTypeBar byCostType={{ LABOR: 600, MATERIAL: 400 }} total={1000} usedPercent={40} />);
    expect(screen.getAllByTestId('cost-segment')).toHaveLength(2);
  });

  it('skips zero-value cost types instead of drawing empty segments', () => {
    render(<CostTypeBar byCostType={{ LABOR: 1000, MATERIAL: 0 }} total={1000} usedPercent={0} />);
    expect(screen.getAllByTestId('cost-segment')).toHaveLength(1);
  });

  it('describes the composition in text for screen readers', () => {
    render(<CostTypeBar byCostType={{ LABOR: 600, MATERIAL: 400 }} total={1000} usedPercent={40} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Labor 60%, Material 40%, 40% used');
  });

  it('renders nothing but a neutral track when there is no budget', () => {
    render(<CostTypeBar byCostType={{}} total={0} usedPercent={null} />);
    expect(screen.queryAllByTestId('cost-segment')).toHaveLength(0);
    expect(screen.getByTestId('cost-track')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- cost-type-bar`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cost-type-bar.tsx`**

A `div` with `data-testid="cost-track"`, `relative h-2 w-full overflow-hidden rounded-sm bg-neutral-100`, containing one `span` per cost type whose value is `> 0`, each with `data-testid="cost-segment"`, `absolute inset-y-0`, `left` from cumulative percentage and `width` from its share of `total`, and a colour per type from a fixed map (LABOR `bg-neutral-700`, MATERIAL `bg-neutral-500`, SUBCONTRACTOR `bg-neutral-400`, EQUIPMENT `bg-neutral-300`, others `bg-neutral-200`). A `used` marker is a 2px `span` at `usedPercent` clamped to 0–100. The container carries `role="img"` and an `aria-label` built as `${label} ${pct}%` joined by `, ` plus `, ${usedPercent}% used` when `usedPercent` is not null. When `total <= 0` render only the track with `aria-label="No budget"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- cost-type-bar`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/cost-type-bar.tsx apps/web/src/features/project/ui/cost-type-bar.test.tsx
git commit -m "feat(budget): stacked cost-type allocation bar"
```

---

### Task 6: Budget tree component

**Files:**
- Create: `apps/web/src/features/project/ui/budget-tree.tsx`
- Test: `apps/web/src/features/project/ui/budget-tree.test.tsx`

**Interfaces:**
- Consumes: `BudgetSummary['wbs']` from Task 1, `CostTypeBar` from Task 5.
- Produces: `BudgetTree({ nodes, selectedId, onSelect }: { nodes: BudgetSummary['wbs']; selectedId: string | null; onSelect: (id: string) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { BudgetTree } from './budget-tree';

const nodes = [
  { id: 'p', code: '1', name: 'Engineering', parentId: null, depth: 0, budget: 400, used: 40, remaining: 360, byCostType: { LABOR: 400 }, plannedValue: 0, itemCount: 2, childrenCount: 2 },
  { id: 'c1', code: '1.1', name: 'Detail Engineering', parentId: 'p', depth: 1, budget: 100, used: 40, remaining: 60, byCostType: { LABOR: 100 }, plannedValue: 0, itemCount: 1, childrenCount: 0 },
  { id: 'c2', code: '1.2', name: 'Shop Drawings', parentId: 'p', depth: 1, budget: 300, used: 0, remaining: 300, byCostType: { LABOR: 300 }, plannedValue: 0, itemCount: 1, childrenCount: 0 },
] as never;

describe('BudgetTree', () => {
  it('collapses children and hides them from the tree', () => {
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText('Detail Engineering')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Engineering/ }));
    expect(screen.queryByText('Detail Engineering')).toBeNull();
  });

  it('marks parents with aria-expanded and selects a node', () => {
    const onSelect = vi.fn();
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={onSelect} />);
    const parent = screen.getByRole('button', { name: /Engineering/ });
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /Detail Engineering/ }));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('shows the rollup budget and used on the parent row', () => {
    render(<BudgetTree nodes={nodes} selectedId={null} onSelect={() => {}} />);
    const row = screen.getByRole('button', { name: /Engineering/ });
    expect(within(row).getByText('400')).toBeTruthy();
    expect(within(row).getByText('40')).toBeTruthy();
  });

  it('marks the selected node with aria-current', () => {
    render(<BudgetTree nodes={nodes} selectedId="c1" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Detail Engineering/ }).getAttribute('aria-current')).toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- budget-tree`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `budget-tree.tsx`**

Build a parent→children map from the flat `nodes` list, keep a `Set<string>` of collapsed ids in `useState`, and render a recursive `<ul>`/`<li>` list. Each row is a `<button type="button">` with `aria-expanded` on parents, `aria-current={selectedId === id}` on the selected node, `onClick` selecting the node (parents toggle collapse via a separate chevron button inside the row that calls `stopPropagation`). Layout is a CSS grid `grid-cols-[minmax(0,1fr)_7rem_5rem_4rem]`: name (indented by `depth * 16px`), budget, used, and `CostTypeBar`. All numbers `font-mono tabular-nums text-right`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- budget-tree`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/budget-tree.tsx apps/web/src/features/project/ui/budget-tree.test.tsx
git commit -m "feat(budget): collapsible WBS tree with rollup and allocation bars"
```

---

### Task 7: Inspector and page rebuild

**Files:**
- Create: `apps/web/src/features/project/ui/budget-inspector.tsx`
- Modify: `apps/web/src/pages/project/budget.page.tsx`
- Modify: `apps/web/src/features/project/ui/budget-row.tsx` (accept and send `costType`)
- Modify: `apps/web/src/features/project/ui/budget-status.tsx` (render warnings)
- Modify: `apps/web/src/features/project/model/budget.api.ts` (send `costType`)
- Test: `apps/web/src/pages/project/budget.page.test.tsx` (create)

**Interfaces:**
- Consumes: `BudgetSummary` (Task 1), `BudgetTree` (Task 6), `useUpsertBudget`/`usePublishBudget`.
- Produces: `BudgetInspector({ node, onSave, saving, published }: { node: BudgetSummary['wbs'][number]; onSave: (costType: CostTypeKey, amount: number) => void; saving: boolean; published: boolean })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';

const summary = vi.hoisted(() => ({
  projectId: 'p1', status: 'DRAFT',
  wbs: [
    { id: 'p', code: '1', name: 'Engineering', parentId: null, depth: 0, budget: 400, used: 40, remaining: 360, byCostType: { LABOR: 400 }, plannedValue: 0, itemCount: 1, childrenCount: 1 },
    { id: 'c1', code: '1.1', name: 'Detail Engineering', parentId: 'p', depth: 1, budget: 400, used: 40, remaining: 360, byCostType: { LABOR: 400 }, plannedValue: 0, itemCount: 1, childrenCount: 0 },
  ],
  totalBudget: 400,
  totals: { budget: 400, used: 40, remaining: 360, contractValue: 1000, variance: 600 },
  warnings: { overContract: false, overAllocated: [], noBudget: [], pvMismatch: null },
  costCoverage: { allocatedNodes: 1, totalNodes: 2 },
}));

vi.mock('@/features/project', async () => {
  const actual = await vi.importActual<typeof import('@/features/project')>('@/features/project');
  return {
    ...actual,
    useBudget: () => ({ data: summary, isLoading: false, isError: false, refetch: vi.fn() }),
    useUpsertBudget: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    usePublishBudget: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
    useProjects: () => ({ data: { items: [{ id: 'p1', code: 'PRJ-1', name: 'Alpha', currency: 'IDR' }] } }),
  };
});

import { BudgetPage } from './budget.page';

describe('BudgetPage', () => {
  it('renders the tree, the totals and the coverage note', () => {
    renderWithProviders(<BudgetPage />);
    expect(screen.getByText('Engineering')).toBeTruthy();
    expect(screen.getByText(/1 of 2 nodes have allocated spend/i)).toBeTruthy();
  });

  it('shows the inspector for the selected node with its cost breakdown', () => {
    renderWithProviders(<BudgetPage />);
    fireEvent.click(screen.getByRole('button', { name: /Detail Engineering/ }));
    const panel = screen.getByRole('complementary', { name: /budget detail/i });
    expect(within(panel).getByText('Labor')).toBeTruthy();
  });

  it('warns when PV does not match the published budget', () => {
    renderWithProviders(<BudgetPage />);
    expect(screen.queryByText(/baseline PV/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/web test -- budget.page`
Expected: FAIL — page still renders the flat table; no coverage note, no inspector.

- [ ] **Step 3: Implement the page, inspector and form changes**

`budget.api.ts`: `useUpsertBudget` already forwards `UpsertBudget`; since `costType` is now required by the schema, the `parse` call will enforce it — no change beyond the type import.

`budget-row.tsx`: change the props to `{ node, onSave, saving, published }`, render one editable row per cost type with a `Select` bound to `costType`, and call `onSave(costType, amount)`.

`budget-inspector.tsx`: an `<aside aria-label="Budget detail">` showing code + name, `byCostType` as a definition list with humanised labels, `plannedValue`, `used`, `remaining` (negative shown in `text-destructive-600`), and the edit form. Disable the form when `published`.

`budget-status.tsx`: add `BudgetWarnings({ warnings })` rendering: `overContract` → "Total exceeds contract value", `noBudget.length` → "N nodes without budget", `pvMismatch` → "Baseline PV is {ratio*100}% of budget", each as a `text-caption` line with an icon; render nothing when all clear.

`budget.page.tsx`: two-column layout on `lg` (`grid-cols-[minmax(0,1fr)_22rem]`), tree on the left, inspector on the right, project selector and warnings above. Coverage line under the tree: `{allocatedNodes} of {totalNodes} nodes have allocated spend`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/web test -- budget.page`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/project/budget.page.tsx apps/web/src/pages/project/budget.page.test.tsx \
        apps/web/src/features/project/ui/budget-inspector.tsx \
        apps/web/src/features/project/ui/budget-row.tsx \
        apps/web/src/features/project/ui/budget-status.tsx \
        apps/web/src/features/project/model/budget.api.ts
git commit -m "feat(budget): rebuild the page as a tree workspace with inspector"
```

---

### Task 8: Full verification and VPS check

**Files:** none (verification only).

- [ ] **Step 1: Run the whole API and web suites**

Run: `pnpm --filter @aec/api test:unit && pnpm --filter @aec/web test`
Expected: all suites pass; no regression in the 488 API tests and 785+ web tests.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: exit 0 for both.

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 4: Verify on the VPS with real data**

On the VPS after `git pull` and `pnpm --filter @aec/api exec prisma migrate deploy`:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/projects/<PRJ-014-id>/budget | head -c 800
```

Expected: `totals.budget` = 4800000000000, `wbs[].byCostType` contains four keys, `costCoverage.allocatedNodes` ≥ 1, `warnings.pvMismatch` non-null (PV is 0 for this project).

- [ ] **Step 5: Commit any fix discovered**

If verification reveals a defect, fix it, re-run the failing check, then:

```bash
git add -A
git commit -m "fix(budget): <what the verification revealed>"
```




