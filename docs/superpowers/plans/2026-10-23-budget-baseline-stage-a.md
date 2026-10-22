# Budget Baseline — Stage A (Baseline Truth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a budget baseline actually exist in the database — versioned, frozen, and immutable — exposed through the API and proven by tests, without changing a single number on any existing screen.

**Architecture:** Two new tables (`BudgetBaseline`, `BudgetBaselineLine`) hold frozen copies of `BudgetItem`. Freezing copies the live rows into a new frozen version; opening a revision copies the last frozen version into a new DRAFT version and mirrors it into `BudgetItem`. `BudgetItem` remains the live working table, so all 13 existing readers of `status = 'PUBLISHED'` keep working untouched. Pure functions do the tree/statement assembly so they can be tested without a database.

**Tech Stack:** NestJS 11, Prisma 6, PostgreSQL 16, Zod (contracts), Jest (`test:unit` = `*.spec.ts`), TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-10-23-budget-baseline-control-surface-design.md`

## Global Constraints

- **Stage A changes no existing number.** `BudgetItem.amount`, `ControlAccount.plannedValue`, and `ActualCostCalculator` are untouched. Any task that would move a figure on the dashboard is out of scope.
- **`BudgetItem.status` values do not change.** `PUBLISHED` = no open revision; `DRAFT` = open revision. Never rename or drop this column.
- **Existing contracts stay additive.** `budgetSummarySchema` and `upsertBudgetSchema` keep working; new shapes are added alongside.
- **`POST /projects/:id/budget/publish` keeps working** as an alias for freeze.
- **All money is `Decimal(18, 2)` in the DB and `number` in the contract.** Convert with `Number(...)` at the boundary; never do arithmetic on Decimal objects.
- **Every mutation writes an audit record and calls `invalidateAnalytics`**, matching `BudgetService.upsert`/`publish`.
- **Migrations are additive and idempotent.** Backfill uses `WHERE NOT EXISTS`; `@@unique([projectId, version])` guards re-runs.
- **Indonesian comments explaining *why*, matching the existing codebase voice.** The repo writes comments in Indonesian; keep that.

## Review Focus

Inputs and conditions the spec implies but no single task's happy-path test covers. Each line names the behaviour a reasonable person expects, and the task that pins it.

1. **A project with zero `BudgetItem` rows** — freeze must refuse with `409 BUDGET_EMPTY`, not create an empty version 1. (Task 6)
2. **Freezing twice without a revision in between** — must refuse with `409 REVISION_OPEN` rather than silently producing an identical v2. (Task 6)
3. **Opening a revision when none exists** — must refuse with `409 BASELINE_NOT_FOUND`, not fabricate a baseline from the live rows. (Task 7)
4. **Frozen data must be immutable** — editing `BudgetItem` after a freeze must not alter any frozen line. (Task 8)
5. **Orphaned WBS after deletion** — a `BudgetBaselineLine` whose WBS was deleted must not crash the statement builder; it is skipped, and the baseline total still reflects the frozen copy. (Task 4)

---

## File Structure

**Create:**

| File | Responsibility |
| --- | --- |
| `apps/api/prisma/migrations/20261023_budget_baseline/migration.sql` | DDL + idempotent backfill |
| `apps/api/src/modules/project/application/services/budget-baseline.ts` | Pure functions: version selection, statement rows, totals. No Prisma. |
| `apps/api/src/modules/project/application/services/budget-baseline.spec.ts` | Unit tests for the above |
| `apps/api/src/modules/project/application/services/budget-baseline.service.ts` | Freeze / openRevision / findBaseline, transactional |
| `apps/api/src/modules/project/application/services/budget-baseline.service.spec.ts` | Service tests with a fake Prisma |
| `apps/api/src/modules/project/presentation/dto/budget-baseline.dto.ts` | Request DTOs |

**Modify:**

| File | Change |
| --- | --- |
| `apps/api/prisma/schema.prisma` | Two models; `BudgetBaseline`/`BudgetBaselineLine` relations on `Project` and `WbsItem` |
| `packages/api-contracts/src/project.ts` | `budgetBaselineSchema`, `budgetStatementRowSchema`, `budgetStatementSchema`, `freezeBaselineSchema`, `openRevisionSchema` |
| `apps/api/src/modules/project/application/services/budget.service.ts` | `findAll` returns a statement built by `budget-baseline.ts` |
| `apps/api/src/modules/project/presentation/controllers/budget.controller.ts` | Three new routes; `publish` delegates to freeze |
| `apps/api/src/modules/project/project.module.ts` | Register `BudgetBaselineService` |
| `apps/api/src/modules/project/application/services/budget.service.spec.ts` | Update expectations to the statement shape |
| `apps/api/prisma/seed-demo.ts` | Freeze v1 for each seeded project, idempotently |

**Why `budget-baseline.ts` is separate from the service:** the spec's testing table requires rollup, totals, and warning rules to be testable without a database. Every existing pure function in this module (`budget-tree.ts`) follows the same split, so this matches the codebase.

---

### Task 1: Baseline schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (after `model BudgetItem`, ~line 696)

**Interfaces:**
- Produces: models `BudgetBaseline` and `BudgetBaselineLine`, plus relations `Project.budgetBaselines` and `WbsItem.baselineLines`. Field names used by every later task: `BudgetBaseline.{id, projectId, version, status, label, reason, frozenAt, frozenBy, createdAt, updatedAt, lines}`, `BudgetBaselineLine.{id, baselineId, wbsItemId, costType, amount}`.

- [ ] **Step 1: Add the two models**

Insert immediately after the `BudgetItem` model in `apps/api/prisma/schema.prisma`:

```prisma
// Baseline beku per proyek. `BudgetItem` adalah tabel kerja hidup; tabel ini
// adalah salinan yang tidak boleh berubah setelah FROZEN, sehingga "baseline"
// akhirnya punya arti data, bukan sekadar label di judul halaman.
model BudgetBaseline {
  id        String    @id @default(cuid())
  projectId String
  project   Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  version   Int
  status    String    @default("DRAFT") // DRAFT | FROZEN
  label     String?
  reason    String?
  frozenAt  DateTime?
  frozenBy  String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  lines BudgetBaselineLine[]

  @@unique([projectId, version])
  @@index([projectId, status])
}

// Satu baris baseline: nilai per WBS per cost type, dibekukan.
model BudgetBaselineLine {
  id         String         @id @default(cuid())
  baselineId String
  baseline   BudgetBaseline @relation(fields: [baselineId], references: [id], onDelete: Cascade)
  wbsItemId  String
  wbsItem    WbsItem        @relation(fields: [wbsItemId], references: [id], onDelete: Cascade)
  costType   String
  amount     Decimal        @db.Decimal(18, 2)

  @@unique([baselineId, wbsItemId, costType])
  @@index([baselineId])
  @@index([wbsItemId])
}
```

- [ ] **Step 2: Add the back-relations**

In `model Project`, add `budgetBaselines BudgetBaseline[]` alongside the other relation fields. In `model WbsItem`, add `baselineLines BudgetBaselineLine[]` alongside the other relation fields. Prisma requires both sides of a relation to be declared.

- [ ] **Step 3: Validate the schema**

Run: `cd apps/api && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(budget): baseline tables for frozen budget versions"
```

---

### Task 2: Migration with idempotent backfill

**Files:**
- Create: `apps/api/prisma/migrations/20261023_budget_baseline/migration.sql`

**Interfaces:**
- Produces: tables `BudgetBaseline`, `BudgetBaselineLine`; every project that already has a `PUBLISHED` `BudgetItem` gets exactly one `FROZEN` baseline at version 1 labelled `Migrated baseline`.

- [ ] **Step 1: Generate the DDL**

Run: `cd apps/api && npx prisma migrate dev --name budget_baseline --create-only`
Expected: a new folder `prisma/migrations/<timestamp>_budget_baseline/` containing generated `CREATE TABLE` statements.

- [ ] **Step 2: Rename the folder to the planned name**

Rename the generated folder to `20261023_budget_baseline` so the plan, the spec, and the file agree. Keep the generated `migration.sql` contents.

- [ ] **Step 3: Append the backfill to `migration.sql`**

Append after the generated DDL:

```sql
-- Backfill: setiap proyek yang sudah punya budget PUBLISHED mendapat baseline
-- v1 FROZEN. Idempoten lewat NOT EXISTS, sehingga aman dijalankan ulang.
INSERT INTO "BudgetBaseline" ("id", "projectId", "version", "status", "label", "frozenAt", "frozenBy", "createdAt", "updatedAt")
SELECT
  'bl_' || p."id" || '_1',
  p."id",
  1,
  'FROZEN',
  'Migrated baseline',
  NOW(),
  'migration',
  NOW(),
  NOW()
FROM "Project" p
WHERE EXISTS (
    SELECT 1 FROM "BudgetItem" b
    WHERE b."projectId" = p."id" AND b."status" = 'PUBLISHED'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "BudgetBaseline" bb
    WHERE bb."projectId" = p."id" AND bb."version" = 1
  );

INSERT INTO "BudgetBaselineLine" ("id", "baselineId", "wbsItemId", "costType", "amount")
SELECT
  'bll_' || b."id",
  'bl_' || b."projectId" || '_1',
  b."wbsItemId",
  b."costType",
  b."amount"
FROM "BudgetItem" b
WHERE b."status" = 'PUBLISHED'
  AND EXISTS (
    SELECT 1 FROM "BudgetBaseline" bb
    WHERE bb."projectId" = b."projectId" AND bb."version" = 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM "BudgetBaselineLine" l
    WHERE l."baselineId" = 'bl_' || b."projectId" || '_1'
      AND l."wbsItemId" = b."wbsItemId"
      AND l."costType" = b."costType"
  );
```

- [ ] **Step 4: Apply it**

Run: `cd apps/api && npx prisma migrate deploy`
Expected: `1 migration applied` (or "No pending migrations" if `migrate dev` already applied it — both are acceptable; the backfill is idempotent).

- [ ] **Step 5: Verify the backfill ran once per project**

Run this against the dev database:

```sql
SELECT "projectId", COUNT(*) AS versions FROM "BudgetBaseline" GROUP BY 1 HAVING COUNT(*) > 1;
```

Expected: zero rows. Any row means a duplicate version was created and the guard failed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/migrations/20261023_budget_baseline
git commit -m "feat(budget): migrate existing published budgets to a frozen v1 baseline"
```

---

### Task 3: Contracts

**Files:**
- Modify: `packages/api-contracts/src/project.ts` (after `budgetSummarySchema`, ~line 459)

**Interfaces:**
- Produces: `budgetBaselineSchema`, `budgetStatementRowSchema`, `budgetStatementSchema`, `freezeBaselineSchema`, `openRevisionSchema` and their inferred types `BudgetBaselineSummary`, `BudgetStatementRow`, `BudgetStatement`, `FreezeBaseline`, `OpenRevision`.
- Consumes: `costTypeKeySchema` (already defined at line 411).

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/modules/project/application/services/budget-contracts.spec.ts` additions — append to the existing file:

```ts
import { budgetStatementSchema, freezeBaselineSchema, openRevisionSchema } from '@aec/api-contracts';

describe('budget statement contract', () => {
  it('rejects a row missing the committed column', () => {
    const row = {
      id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0, childrenCount: 0,
      baseline: 100, revised: 120, actual: 50, available: 70,
      variance: 70, varianceBaseline: 20, byCostType: { LABOR: 120 },
    };
    const result = budgetStatementSchema.shape.rows.element.safeParse(row);
    expect(result.success).toBe(false);
  });

  it('accepts a freeze request with a label', () => {
    expect(freezeBaselineSchema.safeParse({ label: 'Original contract' }).success).toBe(true);
  });

  it('requires a reason when opening a revision', () => {
    expect(openRevisionSchema.safeParse({}).success).toBe(false);
    expect(openRevisionSchema.safeParse({ reason: 'VO-01 steel' }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && pnpm test:unit -- budget-contracts`
Expected: FAIL — `budgetStatementSchema` is not exported.

- [ ] **Step 3: Add the schemas**

In `packages/api-contracts/src/project.ts`, after `budgetSummarySchema`:

```ts
export const budgetBaselineSchema = z.object({
  id: z.string(),
  version: z.number(),
  status: z.enum(['DRAFT', 'FROZEN']),
  label: z.string().nullable(),
  reason: z.string().nullable(),
  frozenAt: z.string().nullable(),
  total: z.number(),
});
export type BudgetBaselineSummary = z.infer<typeof budgetBaselineSchema>;

export const budgetStatementRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  depth: z.number(),
  childrenCount: z.number(),
  /** Nilai baseline beku (versi FROZEN terakhir). */
  baseline: z.number(),
  /** Niat berjalan (BudgetItem hidup). */
  revised: z.number(),
  /** PO + subkontrak yang sudah berkomitmen, per WBS. */
  committed: z.number(),
  /** Biaya nyata: ledger OUT saja — satu sumber, lihat spec §4.5. */
  actual: z.number(),
  /** revised - committed - actual. Boleh negatif. */
  available: z.number(),
  /** revised - actual. Boleh negatif. */
  variance: z.number(),
  /** revised - baseline: berapa niat bergeser dari janji. */
  varianceBaseline: z.number(),
  byCostType: z.record(costTypeKeySchema, z.number()),
});
export type BudgetStatementRow = z.infer<typeof budgetStatementRowSchema>;

export const budgetStatementSchema = z.object({
  projectId: z.string(),
  currency: z.string(),
  baseline: budgetBaselineSchema.nullable(),
  previous: budgetBaselineSchema.nullable(),
  rows: z.array(budgetStatementRowSchema),
  totals: z.object({
    baseline: z.number(),
    revised: z.number(),
    committed: z.number(),
    actual: z.number(),
    available: z.number(),
    variance: z.number(),
    varianceBaseline: z.number(),
    contractValue: z.number(),
    /** Hanya level proyek — Forecast tidak berdimensi WBS (spec §4.4). */
    eac: z.number().nullable(),
    vac: z.number().nullable(),
  }),
  unallocated: z.object({ committed: z.number(), actual: z.number() }),
  reconciliation: z.object({
    ledgerOut: z.number(),
    journalExpense610: z.number(),
    doubleCountRisk: z.boolean(),
  }),
  warnings: z.object({
    overContract: z.boolean(),
    overCommitted: z.array(z.object({ wbsId: z.string(), code: z.string(), amount: z.number() })),
    noBudget: z.array(z.object({ wbsId: z.string(), code: z.string() })),
    pvCoverage: z.object({
      pv: z.number(),
      bac: z.number(),
      status: z.enum(['NO_BASELINE', 'PARTIAL', 'COMPLETE']),
    }),
  }),
  costCoverage: z.object({ allocatedNodes: z.number(), totalNodes: z.number() }),
});
export type BudgetStatement = z.infer<typeof budgetStatementSchema>;

export const freezeBaselineSchema = z.object({
  label: z.string().max(120).optional(),
  reason: z.string().max(500).optional(),
});
export type FreezeBaseline = z.infer<typeof freezeBaselineSchema>;

export const openRevisionSchema = z.object({
  /** Wajib: revisi tanpa alasan tidak dapat diaudit. */
  reason: z.string().min(3).max(500),
  label: z.string().max(120).optional(),
});
export type OpenRevision = z.infer<typeof openRevisionSchema>;
```

- [ ] **Step 4: Export from the package index if needed**

Check `packages/api-contracts/src/index.ts` for a `export * from './project'` line. If schemas are listed explicitly, add the five new names.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/api && pnpm test:unit -- budget-contracts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/api-contracts/src/project.ts apps/api/src/modules/project/application/services/budget-contracts.spec.ts
git commit -m "feat(budget): statement and baseline contracts"
```

---

### Task 4: Statement builder (pure)

**Files:**
- Create: `apps/api/src/modules/project/application/services/budget-baseline.ts`
- Test: `apps/api/src/modules/project/application/services/budget-baseline.spec.ts`

**Interfaces:**
- Consumes: `BudgetStatementRow`, `CostTypeKey` from `@aec/api-contracts`.
- Produces:
  - `interface StatementInput { wbs: Array<{ id: string; code: string; name: string; parentId: string | null }>; baseline: Array<{ wbsItemId: string; costType: CostTypeKey; amount: number }>; revised: Array<{ wbsItemId: string; costType: CostTypeKey; amount: number }>; committed: Array<{ wbsItemId: string; amount: number }>; actual: Array<{ wbsItemId: string; amount: number }>; pvByWbs: Map<string, number> }`
  - `buildStatementRows(input: StatementInput): BudgetStatementRow[]` — flat, pre-order, with `depth`, rolled up
  - `sumTotals(rows: BudgetStatementRow[]): { baseline: number; revised: number; committed: number; actual: number; available: number; variance: number; varianceBaseline: number }` — sums **root** rows only

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/project/application/services/budget-baseline.spec.ts`:

```ts
import { buildStatementRows, sumTotals, type StatementInput } from './budget-baseline';

const wbs = (id: string, code: string, parentId: string | null = null) => ({ id, code, name: `n${id}`, parentId });

const input = (over: Partial<StatementInput> = {}): StatementInput => ({
  wbs: [wbs('p', '1'), wbs('c1', '1.1', 'p'), wbs('c2', '1.2', 'p')],
  baseline: [],
  revised: [],
  committed: [],
  actual: [],
  pvByWbs: new Map(),
  ...over,
});

describe('buildStatementRows', () => {
  it('rolls baseline, revised, committed and actual up to the parent', () => {
    const rows = buildStatementRows(input({
      baseline: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
      revised: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 120 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
      committed: [{ wbsItemId: 'c2', amount: 200 }],
      actual: [{ wbsItemId: 'c1', amount: 40 }],
    }));
    const parent = rows.find((r) => r.id === 'p')!;
    expect(parent.baseline).toBe(400);
    expect(parent.revised).toBe(420);
    expect(parent.committed).toBe(200);
    expect(parent.actual).toBe(40);
  });

  it('computes available and variance after rollup, not by summing children', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 30 }],
      actual: [{ wbsItemId: 'c1', amount: 50 }],
    }));
    const parent = rows.find((r) => r.id === 'p')!;
    // available = revised - committed - actual = 100 - 30 - 50
    expect(parent.available).toBe(20);
    expect(parent.variance).toBe(50);
  });

  it('keeps a negative variance negative instead of clamping to zero', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      actual: [{ wbsItemId: 'c1', amount: 150 }],
    }));
    expect(rows.find((r) => r.id === 'c1')!.variance).toBe(-50);
  });

  it('sets varianceBaseline to revised minus baseline', () => {
    const rows = buildStatementRows(input({
      baseline: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 130 }],
    }));
    expect(rows.find((r) => r.id === 'c1')!.varianceBaseline).toBe(30);
  });

  it('emits rows in pre-order with depth, so the table can render hierarchy', () => {
    const rows = buildStatementRows(input());
    expect(rows.map((r) => [r.code, r.depth])).toEqual([['1', 0], ['1.1', 1], ['1.2', 1]]);
  });

  it('skips spend whose WBS no longer exists instead of throwing', () => {
    const rows = buildStatementRows(input({
      actual: [{ wbsItemId: 'deleted', amount: 999 }],
    }));
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.actual === 0)).toBe(true);
  });

  it('rolls byCostType across the subtree', () => {
    const rows = buildStatementRows(input({
      revised: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
    }));
    expect(rows.find((r) => r.id === 'p')!.byCostType).toEqual({ LABOR: 100, MATERIAL: 300 });
  });

  it('treats an orphan as a root so no row disappears', () => {
    const rows = buildStatementRows(input({ wbs: [wbs('x', '9', 'missing')] }));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.depth).toBe(0);
  });
});

describe('sumTotals', () => {
  it('sums root rows only, so children are not counted twice', () => {
    const rows = buildStatementRows(input({
      revised: [
        { wbsItemId: 'c1', costType: 'LABOR', amount: 100 },
        { wbsItemId: 'c2', costType: 'MATERIAL', amount: 300 },
      ],
    }));
    expect(sumTotals(rows).revised).toBe(400);
  });

  it('recomputes available and variance from the totals', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 30 }],
      actual: [{ wbsItemId: 'c1', amount: 50 }],
    }));
    const t = sumTotals(rows);
    expect(t.available).toBe(20);
    expect(t.variance).toBe(50);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test:unit -- budget-baseline`
Expected: FAIL — cannot find module `./budget-baseline`.

- [ ] **Step 3: Implement `budget-baseline.ts`**

Export `StatementInput`, `buildStatementRows`, `sumTotals`. Approach: reuse the same shape as `budget-tree.ts` — build `childrenOf` and `roots`, resolve depth via `parentId` chain with a `seen` set so cycles and orphans become roots (copy the `resolveDepth`/`isUnderCycle` approach from `budget-tree.ts:64-133` rather than re-deriving it), recurse to roll up, then flatten pre-order. `available`, `variance`, `varianceBaseline` are computed **once per node after its children have rolled up**. `sumTotals` filters `depth === 0` and recomputes the three derived fields from the summed base fields.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test:unit -- budget-baseline`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/budget-baseline.ts apps/api/src/modules/project/application/services/budget-baseline.spec.ts
git commit -m "feat(budget): pure statement builder with rollup and derived columns"
```

---

### Task 5: Warning rules and reconciliation (pure)

**Files:**
- Modify: `apps/api/src/modules/project/application/services/budget-baseline.ts`
- Modify: `apps/api/src/modules/project/application/services/budget-baseline.spec.ts`

**Interfaces:**
- Produces:
  - `collectStatementWarnings(totals: { revised: number; contractValue: number }, rows: BudgetStatementRow[], pv: number): BudgetStatement['warnings']`
  - `reconcile(ledgerOut: number, journalExpense610: number): BudgetStatement['reconciliation']`
  - `costCoverage(rows: BudgetStatementRow[]): { allocatedNodes: number; totalNodes: number }`

- [ ] **Step 1: Write the failing tests**

Append to `budget-baseline.spec.ts`:

```ts
import { collectStatementWarnings, reconcile, costCoverage } from './budget-baseline';

describe('pvCoverage', () => {
  const totals = { revised: 1000, contractValue: 5000 };
  const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 1000 }] }));

  it('reports NO_BASELINE when pv is zero', () => {
    expect(collectStatementWarnings(totals, rows, 0).pvCoverage.status).toBe('NO_BASELINE');
  });

  it('does not warn when pv is below bac — that is normal for a time-phased baseline', () => {
    const w = collectStatementWarnings(totals, rows, 600);
    expect(w.pvCoverage.status).toBe('COMPLETE');
    // Rasio lama sengaja tidak ada lagi: PV != BAC bukan pelanggaran (spec §4.7).
    expect('ratio' in w.pvCoverage).toBe(false);
  });

  it('reports PARTIAL when pv exceeds bac', () => {
    expect(collectStatementWarnings(totals, rows, 1200).pvCoverage.status).toBe('PARTIAL');
  });
});

describe('collectStatementWarnings', () => {
  const totals = { revised: 1000, contractValue: 5000 };

  it('flags a revised total above the contract value', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 1000 }] }));
    expect(collectStatementWarnings({ revised: 6000, contractValue: 5000 }, rows, 0).overContract).toBe(true);
  });

  it('flags overCommitted only on leaves, and only when committed exceeds revised', () => {
    const rows = buildStatementRows(input({
      revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }],
      committed: [{ wbsItemId: 'c1', amount: 150 }],
    }));
    const w = collectStatementWarnings(totals, rows, 0);
    expect(w.overCommitted.map((n) => n.code)).toEqual(['1.1']);
    expect(w.overCommitted[0]!.amount).toBe(50);
  });

  it('lists leaf nodes with no revised budget', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }] }));
    expect(collectStatementWarnings(totals, rows, 0).noBudget.map((n) => n.code)).toEqual(['1.2']);
  });

  it('does not list a parent that only rolls up its children as noBudget', () => {
    const rows = buildStatementRows(input({ revised: [{ wbsItemId: 'c1', costType: 'LABOR', amount: 100 }] }));
    expect(collectStatementWarnings(totals, rows, 0).noBudget.map((n) => n.code)).not.toContain('1');
  });
});

describe('reconcile', () => {
  it('flags doubleCountRisk only when both sides are positive', () => {
    expect(reconcile(100, 50).doubleCountRisk).toBe(true);
    expect(reconcile(100, 0).doubleCountRisk).toBe(false);
    expect(reconcile(0, 50).doubleCountRisk).toBe(false);
    expect(reconcile(0, 0).doubleCountRisk).toBe(false);
  });
});

describe('costCoverage', () => {
  it('counts nodes that actually carry spend', () => {
    const rows = buildStatementRows(input({ actual: [{ wbsItemId: 'c1', amount: 10 }] }));
    expect(costCoverage(rows)).toEqual({ allocatedNodes: 2, totalNodes: 3 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test:unit -- budget-baseline`
Expected: FAIL — `collectStatementWarnings` is not exported.

- [ ] **Step 3: Implement the three functions**

Rules, exactly as the spec fixes them:

- `pvCoverage`: `pv === 0` → `NO_BASELINE`; `pv > 0 && pv <= revised` → `COMPLETE`; `pv > revised` → `PARTIAL`. Return `{ pv, bac: revised, status }`. **No ratio field** — the old `pvMismatch` ratio is deliberately gone (spec §4.7).
- `overContract`: `contractValue > 0 && revised > contractValue`.
- `overCommitted`: leaves only (`childrenCount === 0`), `committed > revised && revised > 0`, amount = `committed - revised`.
- `noBudget`: leaves only, `revised === 0`.
- `reconcile`: `doubleCountRisk = ledgerOut > 0 && journalExpense610 > 0`.
- `costCoverage`: `allocatedNodes` counts nodes with `actual > 0` (a parent that rolls up a child's spend counts, which is why the test expects 2).

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test:unit -- budget-baseline`
Expected: PASS, 20 tests total.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/budget-baseline.ts apps/api/src/modules/project/application/services/budget-baseline.spec.ts
git commit -m "feat(budget): pv coverage, over-commitment warnings and reconciliation"
```

---

### Task 6: Freeze and open revision

**Files:**
- Create: `apps/api/src/modules/project/application/services/budget-baseline.service.ts`
- Create: `apps/api/src/modules/project/application/services/budget-baseline.service.spec.ts`
- Create: `apps/api/src/modules/project/presentation/dto/budget-baseline.dto.ts`

**Interfaces:**
- Consumes: `PrismaService`, `AuditService`, `CacheService`, `invalidateAnalytics`.
- Produces:
  - `BudgetBaselineService.findBaseline(projectId: string)` → `{ current: BudgetBaselineSummary | null; previous: BudgetBaselineSummary | null }`
  - `BudgetBaselineService.freeze(projectId: string, dto: FreezeBaselineDto, actorId: string)` → `BudgetBaselineSummary`
  - `BudgetBaselineService.openRevision(projectId: string, dto: OpenRevisionDto, actorId: string)` → `BudgetBaselineSummary`

- [ ] **Step 1: Write the DTOs**

Create `apps/api/src/modules/project/presentation/dto/budget-baseline.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class FreezeBaselineDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class OpenRevisionDto {
  /** Wajib: revisi tanpa alasan tidak dapat diaudit. */
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `budget-baseline.service.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetBaselineService } from './budget-baseline.service';

const tx = {
  budgetBaseline: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  budgetBaselineLine: { createMany: jest.fn(), findMany: jest.fn() },
  budgetItem: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn(), updateMany: jest.fn() },
};

const prisma = {
  project: { findUnique: jest.fn() },
  budgetItem: { findMany: jest.fn() },
  budgetBaseline: { findFirst: jest.fn(), findMany: jest.fn() },
  budgetBaselineLine: { findMany: jest.fn() },
  $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};

const audit = { record: jest.fn() };
const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };

const make = () => new BudgetBaselineService(prisma as never, audit as never, cache as never);

/**
 * Fake `findFirst` yang menghormati filter `status`. Tanpa ini, pemanggilan
 * kedua (cek DRAFT lalu ambil versi terakhir) akan mengembalikan baris yang sama
 * dan test gagal karena alasan yang salah — bukan karena kode salah.
 */
const baselineLookups = (state: {
  openDraft?: { id: string; version: number; status: string } | null;
  lastFrozen?: { id: string; version: number; status: string } | null;
  lastAny?: { id: string; version: number; status: string } | null;
}) => {
  tx.budgetBaseline.findFirst.mockImplementation(async (args: { where?: { status?: string } }) => {
    const status = args?.where?.status;
    if (status === 'DRAFT') return state.openDraft ?? null;
    if (status === 'FROZEN') return state.lastFrozen ?? null;
    return state.lastAny ?? null;
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', code: 'PRJ-1' });
});

describe('freeze', () => {
  it('refuses when the project has no budget rows', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([]);
    await expect(make().freeze('p1', {}, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses when a revision is already open', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({ openDraft: { id: 'b', version: 2, status: 'DRAFT' } });
    await expect(make().freeze('p1', {}, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFound when the project does not exist', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(make().freeze('nope', {}, 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('copies every budget row into a new FROZEN version', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 100 },
      { wbsItemId: 'w1', costType: 'MATERIAL', amount: 250 },
    ]);
    baselineLookups({ lastAny: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'FROZEN' });

    await make().freeze('p1', { label: 'Original' }, 'u1');

    expect(tx.budgetBaseline.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ projectId: 'p1', version: 2, status: 'FROZEN', label: 'Original' }) }),
    );
    expect(tx.budgetBaselineLine.createMany).toHaveBeenCalledWith({
      data: [
        { baselineId: 'b2', wbsItemId: 'w1', costType: 'LABOR', amount: 100 },
        { baselineId: 'b2', wbsItemId: 'w1', costType: 'MATERIAL', amount: 250 },
      ],
    });
  });

  it('marks the live rows PUBLISHED so existing readers keep working', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({});
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b1', version: 1, status: 'FROZEN' });

    await make().freeze('p1', {}, 'u1');

    expect(tx.budgetItem.updateMany).toHaveBeenCalledWith({ where: { projectId: 'p1' }, data: { status: 'PUBLISHED' } });
  });

  it('writes an audit record and invalidates the analytics cache', async () => {
    prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    baselineLookups({});
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b1', version: 1, status: 'FROZEN' });

    await make().freeze('p1', {}, 'u1');

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'BUDGET.BASELINE_FREEZE' }));
    expect(cache.delByPattern).toHaveBeenCalled();
  });
});

describe('openRevision', () => {
  it('refuses when there is no frozen baseline to revise', async () => {
    baselineLookups({});
    await expect(make().openRevision('p1', { reason: 'VO-01' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses when a revision is already open', async () => {
    baselineLookups({ openDraft: { id: 'b', version: 2, status: 'DRAFT' } });
    await expect(make().openRevision('p1', { reason: 'VO-01' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('copies the last frozen version into a DRAFT and mirrors it into BudgetItem', async () => {
    baselineLookups({ lastFrozen: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaselineLine.findMany.mockResolvedValue([
      { wbsItemId: 'w1', costType: 'LABOR', amount: 100 },
    ]);
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'DRAFT' });

    await make().openRevision('p1', { reason: 'VO-01 steel' }, 'u1');

    expect(tx.budgetItem.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
    expect(tx.budgetItem.createMany).toHaveBeenCalledWith({
      data: [{ projectId: 'p1', wbsItemId: 'w1', costType: 'LABOR', amount: 100, status: 'DRAFT' }],
    });
  });

  it('leaves the frozen baseline untouched', async () => {
    baselineLookups({ lastFrozen: { id: 'b1', version: 1, status: 'FROZEN' } });
    tx.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 100 }]);
    tx.budgetBaseline.create.mockResolvedValue({ id: 'b2', version: 2, status: 'DRAFT' });

    await make().openRevision('p1', { reason: 'VO-01' }, 'u1');

    expect(tx.budgetBaseline.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd apps/api && pnpm test:unit -- budget-baseline.service`
Expected: FAIL — cannot find module.

- [ ] **Step 4: Implement `budget-baseline.service.ts`**

Shape (mirror `BudgetService`: `@Inject` each dependency, Indonesian comments for the *why*):

- `freeze`:
  1. `project.findUnique` → `NotFoundException({ code: 'PROJECT_NOT_FOUND' })`.
  2. `budgetItem.findMany({ where: { projectId } })` → if empty, `ConflictException({ code: 'BUDGET_EMPTY' })`.
  3. Inside `$transaction`: `budgetBaseline.findFirst({ where: { projectId, status: 'DRAFT' } })` → if found, `ConflictException({ code: 'REVISION_OPEN' })`.
  4. `budgetBaseline.findFirst({ where: { projectId }, orderBy: { version: 'desc' } })` → `nextVersion = (last?.version ?? 0) + 1`.
  5. `budgetBaseline.create` with `status: 'FROZEN'`, `frozenAt: new Date()`, `frozenBy: actorId`, optional `label`/`reason`.
  6. `budgetBaselineLine.createMany` with one row per `BudgetItem`.
  7. `budgetItem.updateMany({ where: { projectId }, data: { status: 'PUBLISHED' } })`.
- `openRevision`:
  1–3. Same guards, plus `ConflictException({ code: 'BASELINE_NOT_FOUND' })` when no `FROZEN` baseline exists.
  4. `budgetBaselineLine.findMany({ where: { baselineId: lastFrozen.id } })`.
  5. Create `DRAFT` version `lastFrozen.version + 1`.
  6. `budgetItem.deleteMany({ where: { projectId } })` then `createMany` mirroring the frozen lines with `status: 'DRAFT'`. **Replacing rather than upserting** keeps the live table exactly equal to the frozen set — no stale rows from a cost type that the revision dropped.
  7. Copy lines into the new baseline too, so the draft version is inspectable before it is frozen.
- Both: `audit.record({ action: 'BUDGET.BASELINE_FREEZE' | 'BUDGET.REVISION_OPEN', resource: 'BudgetBaseline', resourceId, newValue: { projectId, version, lines, total }, source: 'api' })` then `await invalidateAnalytics(this.cache)`.
- `findBaseline`: `findMany({ where: { projectId, status: 'FROZEN' }, orderBy: { version: 'desc' }, take: 2, include: { lines: true } })`, map to `BudgetBaselineSummary` with `total = sum(lines.amount)`.

- [ ] **Step 5: Run to verify it passes**

Run: `cd apps/api && pnpm test:unit -- budget-baseline.service`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/project/application/services/budget-baseline.service.ts apps/api/src/modules/project/application/services/budget-baseline.service.spec.ts apps/api/src/modules/project/presentation/dto/budget-baseline.dto.ts
git commit -m "feat(budget): freeze and open-revision flow with guards and audit"
```

---

### Task 7: Wire the routes

**Files:**
- Modify: `apps/api/src/modules/project/presentation/controllers/budget.controller.ts`
- Modify: `apps/api/src/modules/project/project.module.ts`

**Interfaces:**
- Consumes: `BudgetBaselineService` from Task 6.
- Produces: `GET /projects/:projectId/budget/baseline`, `POST /projects/:projectId/budget/baseline/freeze`, `POST /projects/:projectId/budget/baseline/revision`.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/src/modules/project/application/services/budget.service.spec.ts` (or a new `budget.controller.spec.ts`):

```ts
it('exposes publish as an alias for freeze', async () => {
  const baseline = { freeze: jest.fn().mockResolvedValue({ version: 1 }) };
  const controller = new BudgetController({} as never, baseline as never);
  await controller.publish('p1', {}, { user: { sub: 'u1' } });
  expect(baseline.freeze).toHaveBeenCalledWith('p1', {}, 'u1');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test:unit -- budget.controller`
Expected: FAIL — `BudgetController` does not take a second constructor argument.

- [ ] **Step 3: Implement**

In `budget.controller.ts`: add `@Inject(BudgetBaselineService) private readonly baseline: BudgetBaselineService` as the second constructor parameter. Add the three routes with `Permission.BudgetView` (GET) and `Permission.BudgetApprove` (both POSTs). Change `publish` to delegate: `return this.baseline.freeze(projectId, { reason: dto.note }, request.user?.sub ?? 'system')`.

In `project.module.ts`: add `BudgetBaselineService` to `providers`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test:unit -- budget.controller`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/presentation/controllers/budget.controller.ts apps/api/src/modules/project/project.module.ts apps/api/src/modules/project/application/services/budget.service.spec.ts
git commit -m "feat(budget): baseline routes; publish delegates to freeze"
```

---

### Task 8: `findAll` returns a statement

**Files:**
- Modify: `apps/api/src/modules/project/application/services/budget.service.ts:26-128`
- Modify: `apps/api/src/modules/project/application/services/budget.service.spec.ts`

**Interfaces:**
- Consumes: `buildStatementRows`, `sumTotals`, `collectStatementWarnings`, `reconcile`, `costCoverage` from Tasks 4–5.
- Produces: `BudgetService.findAll(projectId)` → `BudgetStatement` (contract from Task 3).

- [ ] **Step 1: Rewrite the existing expectations**

First extend the fake Prisma at the top of `budget.service.spec.ts` with the models `findAll` now touches — otherwise every test fails with "not a function" before reaching an assertion:

```ts
const prisma = {
  project: { findUnique: jest.fn() },
  wbsItem: { findMany: jest.fn(), findUnique: jest.fn() },
  budgetItem: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
  stockLedgerEntry: { groupBy: jest.fn() },
  journalLine: { groupBy: jest.fn() },
  controlAccount: { groupBy: jest.fn() },
  budgetBaseline: { findFirst: jest.fn() },
  budgetBaselineLine: { findMany: jest.fn() },
  purchaseOrderItem: { groupBy: jest.fn() },
  forecast: { findFirst: jest.fn() },
};
```

Also add to `beforeEach`: `prisma.budgetBaseline.findFirst.mockResolvedValue(null)`, `prisma.budgetBaselineLine.findMany.mockResolvedValue([])`, `prisma.purchaseOrderItem.groupBy.mockResolvedValue([])`, `prisma.forecast.findFirst.mockResolvedValue(null)` — so tests that do not care about those inputs still run.

Then replace the assertions in `describe('findAll')` with statement-shape assertions:

```ts
it('returns a statement with baseline, revised, actual and totals', async () => {
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000, currency: 'IDR' });
  prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
  prisma.budgetItem.findMany.mockResolvedValue([
    { wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 },
  ]);
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
  prisma.controlAccount.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { plannedValue: 600 } }]);
  prisma.budgetBaseline.findFirst.mockResolvedValue({ id: 'b1', version: 1, status: 'FROZEN', label: null, reason: null, frozenAt: new Date() });
  prisma.budgetBaselineLine.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 900 }]);

  const res = await make().findAll('p1');

  expect(res.rows[0]!.revised).toBe(1000);
  expect(res.rows[0]!.baseline).toBe(900);
  expect(res.rows[0]!.actual).toBe(400);
  expect(res.rows[0]!.variance).toBe(600);
  expect(res.rows[0]!.varianceBaseline).toBe(100);
  expect(res.totals.contractValue).toBe(5000);
});

it('counts actual from the ledger only, never adding the expense journal', async () => {
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000, currency: 'IDR' });
  prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
  prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 }]);
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalValue: -400 } }]);
  prisma.journalLine.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { debit: 75 } }]);
  prisma.controlAccount.groupBy.mockResolvedValue([]);
  prisma.budgetBaseline.findFirst.mockResolvedValue(null);
  prisma.budgetBaselineLine.findMany.mockResolvedValue([]);

  const res = await make().findAll('p1');

  expect(res.rows[0]!.actual).toBe(400);
  expect(res.reconciliation.journalExpense610).toBe(75);
  expect(res.reconciliation.doubleCountRisk).toBe(true);
});

it('reports no baseline rather than pretending one exists', async () => {
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000, currency: 'IDR' });
  prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
  prisma.budgetItem.findMany.mockResolvedValue([]);
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([]);
  prisma.journalLine.groupBy.mockResolvedValue([]);
  prisma.controlAccount.groupBy.mockResolvedValue([]);
  prisma.budgetBaseline.findFirst.mockResolvedValue(null);
  prisma.budgetBaselineLine.findMany.mockResolvedValue([]);

  const res = await make().findAll('p1');

  expect(res.baseline).toBeNull();
  expect(res.rows[0]!.baseline).toBe(0);
});

it('takes committed from released PO items on the same WBS', async () => {
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000, currency: 'IDR' });
  prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
  prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 }]);
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([]);
  prisma.journalLine.groupBy.mockResolvedValue([]);
  prisma.controlAccount.groupBy.mockResolvedValue([]);
  prisma.budgetBaseline.findFirst.mockResolvedValue(null);
  prisma.budgetBaselineLine.findMany.mockResolvedValue([]);
  prisma.purchaseOrderItem.groupBy.mockResolvedValue([{ wbsItemId: 'w1', _sum: { totalPrice: 250 } }]);

  const res = await make().findAll('p1');

  expect(res.rows[0]!.committed).toBe(250);
  // available = revised - committed - actual = 1000 - 250 - 0
  expect(res.rows[0]!.available).toBe(750);
});

it('exposes EAC and VAC on the totals only, never per row', async () => {
  prisma.project.findUnique.mockResolvedValue({ id: 'p1', contractValue: 5000, currency: 'IDR' });
  prisma.wbsItem.findMany.mockResolvedValue([{ id: 'w1', code: '1', name: 'Engineering', parentId: null }]);
  prisma.budgetItem.findMany.mockResolvedValue([{ wbsItemId: 'w1', costType: 'LABOR', amount: 1000, status: 'PUBLISHED', version: 1 }]);
  prisma.stockLedgerEntry.groupBy.mockResolvedValue([]);
  prisma.journalLine.groupBy.mockResolvedValue([]);
  prisma.controlAccount.groupBy.mockResolvedValue([]);
  prisma.budgetBaseline.findFirst.mockResolvedValue(null);
  prisma.budgetBaselineLine.findMany.mockResolvedValue([]);
  prisma.purchaseOrderItem.groupBy.mockResolvedValue([]);
  prisma.forecast.findFirst.mockResolvedValue({ estimateAtCompletion: 1200, varianceAtCompletion: -200 });

  const res = await make().findAll('p1');

  expect(res.totals.eac).toBe(1200);
  expect(res.totals.vac).toBe(-200);
  expect('eac' in res.rows[0]!).toBe(false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test:unit -- budget.service`
Expected: FAIL — `res.rows` is undefined.

- [ ] **Step 3: Implement**

Replace the body of `findAll`:

1. Keep the existing `Promise.all` for `wbsItem`, `budgetItem`, `stockLedgerEntry.groupBy` (actual), `journalLine.groupBy` (reconciliation only), `controlAccount.groupBy` (PV).
2. Add `budgetBaseline.findFirst({ where: { projectId, status: 'FROZEN' }, orderBy: { version: 'desc' } })` and, when found, `budgetBaselineLine.findMany({ where: { baselineId } })`.
3. Add `purchaseOrderItem` aggregate per `wbsItemId` for `committed` — sum `totalPrice` where the parent PO is `RELEASED` and `wbsItemId` is not null.
4. Build `StatementInput`, call `buildStatementRows`, `sumTotals`, `collectStatementWarnings`, `reconcile`, `costCoverage`.
5. Add `eac`/`vac` from `forecast.findFirst({ where: { projectId }, orderBy: { version: 'desc' } })`; `null` when absent.
6. **Delete** the `used`-based code path. `actual` comes from the ledger aggregate only — no journal addition. Add a comment stating the spec §4.5 reason so nobody re-adds it.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test:unit -- budget.service`
Expected: PASS.

- [ ] **Step 5: Run the whole API unit suite**

Run: `cd apps/api && pnpm test:unit`
Expected: PASS. If any other spec asserted the old `wbs`/`used` shape, update it to `rows`/`actual` — the shape change is the point of this task.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/project/application/services/budget.service.ts apps/api/src/modules/project/application/services/budget.service.spec.ts
git commit -m "feat(budget): serve a cost statement instead of a rollup tree"
```

---

### Task 9: Seed a frozen baseline

**Files:**
- Modify: `apps/api/prisma/seed-demo.ts` (in the per-project loop, after the `budgetItem` block at ~line 520)

**Interfaces:**
- Consumes: nothing from earlier tasks at the type level; writes directly via Prisma.
- Produces: every seeded project with budget rows has exactly one `FROZEN` baseline at version 1.

- [ ] **Step 1: Add the idempotent freeze to the seed**

After the `wbsSeed` loop, inside the same `if (p.profile === 'nobudget') continue;` guard region:

```ts
// Baseline v1 beku untuk proyek demo. Idempoten: hanya dibuat bila belum ada,
// sehingga seed ulang tidak menumpuk versi.
const existingBaseline = await prisma.budgetBaseline.findFirst({
  where: { projectId: project.id, version: 1 },
});
if (!existingBaseline) {
  const rows = await prisma.budgetItem.findMany({ where: { projectId: project.id } });
  if (rows.length > 0) {
    const baseline = await prisma.budgetBaseline.create({
      data: {
        projectId: project.id, version: 1, status: 'FROZEN',
        label: 'Seeded baseline', frozenAt: new Date(), frozenBy: 'seed',
      },
    });
    await prisma.budgetBaselineLine.createMany({
      data: rows.map((r) => ({
        baselineId: baseline.id, wbsItemId: r.wbsItemId, costType: r.costType, amount: r.amount,
      })),
    });
  }
}
```

- [ ] **Step 2: Run the seed against a fresh database**

Run: `cd apps/api && pnpm db:reset`
Expected: completes without error; the log shows no Prisma unique-constraint violation.

- [ ] **Step 3: Verify one baseline per project and matching totals**

```sql
SELECT bb."projectId", bb.version, COUNT(l.id) AS lines,
       SUM(l.amount) AS baseline_total
FROM "BudgetBaseline" bb
LEFT JOIN "BudgetBaselineLine" l ON l."baselineId" = bb.id
GROUP BY 1, 2
HAVING COUNT(*) FILTER (WHERE bb.version > 1) > 0;
```

Expected: zero rows. Then compare one project's baseline total against its `BudgetItem` sum — they must be equal.

- [ ] **Step 4: Verify no dashboard number moved**

Run the existing dashboard/portfolio specs:

Run: `cd apps/api && pnpm test:unit -- portfolio earned-value commitment forecast project-health`
Expected: PASS unchanged. These read `BudgetItem.status = 'PUBLISHED'`, which the seed still sets.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed-demo.ts
git commit -m "feat(budget): seed a frozen v1 baseline for demo projects"
```

---

### Task 10: Typecheck and full gate

**Files:** none modified.

- [ ] **Step 1: Typecheck the workspace**

Run: `pnpm typecheck`
Expected: PASS for `api`, `web`, and packages.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Full API unit suite**

Run: `cd apps/api && pnpm test:unit`
Expected: PASS.

- [ ] **Step 4: Web suite (contract consumers)**

Run: `cd apps/web && pnpm test`
Expected: PASS. The web app still reads the old `budgetSummarySchema` shape, which this stage deliberately keeps working; Stage B switches it.

- [ ] **Step 5: Commit any formatting fixes**

```bash
git add -A
git commit -m "chore(budget): formatting and typecheck fixes for stage A"
```

---

## Stage A completion criteria

- `BudgetBaseline` and `BudgetBaselineLine` exist, with one `FROZEN` v1 for every project that had a published budget.
- `GET /projects/:id/budget` returns a statement with `baseline`, `revised`, `committed`, `actual`, `available`, `variance`, `varianceBaseline`.
- `POST .../baseline/freeze` and `.../baseline/revision` work with the three guards (`BUDGET_EMPTY`, `REVISION_OPEN`, `BASELINE_NOT_FOUND`).
- `POST .../budget/publish` still works, delegating to freeze.
- `actual` comes from the ledger only; `reconciliation` reports the journal separately.
- No number on the dashboard, portfolio, or control tower moved.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, and the web suite pass.

**Not in this stage:** the UI rebuild (Stage B), the committed column's subcontract half and EAC/VAC display (Stage C), and the actual-cost double-count fix (separate spec).



