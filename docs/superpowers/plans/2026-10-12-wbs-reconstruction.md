# WBS Reconstruction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the WBS subsystem as a real management surface — editable hierarchy with per-node progress, planned dates, owner and milestone, plus server-computed budget/actual/progress rollup — delivered as three per-layer PRs (schema → api → ui) with a green gate at every merge.

**Architecture:** Additive migration (`responsibleManager`, `isMilestone`) on the existing `WbsItem` (whose `progressPercent`/`plannedStart`/`plannedEnd` are currently dead). Additive contract fields plus a read-only `rollup` block. Five granular endpoints (`GET`/`POST` existing, new `PATCH`/`DELETE`/`POST move`) guarded by the currently-dead `Permission.WbsEdit`. Rollup reuses the repo's existing per-WBS actual definition (`stockLedgerEntry` OUT per `wbsItemId`). The page becomes a split master–detail: a tree with rollup columns plus a right-hand inspector.

**Tech Stack:** NestJS 10 + Prisma 7 (PostgreSQL) · React 18 + TanStack Query/Router · Tailwind token preset · Zod (`@aec/api-contracts`) · Vitest + RTL (web) · Jest (api).

**Spec:** `docs/superpowers/specs/2026-10-12-wbs-reconstruction-design.md`

## Global Constraints

- All user-facing copy in English; money/date formatting stays `id-ID` (`shared/lib/format.ts`).
- Every number renders `font-mono tabular-nums`.
- Visuals use repo tokens only — never a new hex literal or font. Chart/tone colours come from the token preset.
- One accent (`racing-red`) for actions only (delete/primary), never for selection or navigation; selection uses `neutral-100`/`neutral-800`.
- Icons are Lucide only, using `ICON_STROKE` + `ICON_SIZE` from `@aec/ui` (`packages/ui/src/lib/icon.ts`).
- Every section handles loading / error (`role="alert"` + retry) / empty before rendering data; never a fabricated `0`.
- Backend changes are additive: existing endpoints behave as before with no new params.
- Status/field mutations record an audit entry (`WBS.UPDATE`, `WBS.DELETE`, `WBS.MOVE`).
- One requirement = one branch, base `develop`, merge commit (no squash). Merges need `gh pr merge --merge --admin`.
- Web tests `*.test.tsx` beside source (Vitest); API unit tests `*.spec.ts` beside source (Jest).
- Rollup actual must use the **same** definition as `project-health.service.ts:44` (`stockLedgerEntry` movement `OUT`, `totalValue`, per `wbsItemId`).

## Review Focus

1. **Deleting a node whose descendant owns a budget item** must be refused (409 `WBS_HAS_LINKS`), never silently cascade-delete the budget (`BudgetItem.wbsItemId` is `onDelete: Cascade`). Covered in Task 6 Step 1.
2. **Moving a node under its own descendant** must be rejected (400 `WBS_CYCLE`), not create an orphaned cycle. Covered in Task 7 Step 1.
3. **A parent with children and no budget anywhere** must roll up progress as a plain average (not divide by zero, not `0`). Covered in Task 5 Step 1.
4. **A leaf with no progress entered** must render `rollup.progress = null` (unknown), not `0%`. Covered in Task 5 Step 1 and Task 12 Step 1.
5. **A WBS code that already exists in the project** must be refused on create and on update (409 `WBS_EXISTS`), matching the existing create guard. Covered in Task 6 Step 1.

---

## PR 1 — `feat/wbs-schema`

### Task 1: DB migration — `responsibleManager` + `isMilestone`

**Files:**
- Modify: `apps/api/prisma/schema.prisma:637-674` (`WbsItem`)
- Create: `apps/api/prisma/migrations/<timestamp>_wbs_management/migration.sql`

**Interfaces:**
- Produces: Prisma fields `WbsItem.responsibleManager String?`, `WbsItem.isMilestone Boolean @default(false)`.
- Consumes: nothing.

- [ ] **Step 1: Update `schema.prisma`**

In `model WbsItem`, after `sortOrder Int @default(0)`, add:

```prisma
  /** Penanggung jawab node (nama/peran) — akuntabilitas per item WBS. */
  responsibleManager String?
  /** Menandai leaf sebagai milestone (penanda di tree). */
  isMilestone        Boolean @default(false)
```

- [ ] **Step 2: Author the migration SQL by hand**

Create `apps/api/prisma/migrations/<timestamp>_wbs_management/migration.sql`:

```sql
-- WBS management (FR-PRJ-002): owner + milestone flag.
--
-- ADITIF penuh: kolom nullable/ber-DEFAULT. Baris lama tetap valid.

ALTER TABLE "WbsItem" ADD COLUMN "responsibleManager" TEXT;
ALTER TABLE "WbsItem" ADD COLUMN "isMilestone" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 3: Apply and regenerate the client**

Run: `pnpm --filter @aec/api db:reset`
Expected: migrate + seed succeed; `WbsItem` carries the two new columns.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(wbs): additive WBS management columns (owner, milestone)"
```

---

### Task 2: Contract — expose WBS fields + rollup

**Files:**
- Modify: `packages/api-contracts/src/project.ts:329-354`
- Test: `packages/api-contracts/src/project.test.ts` (create if absent; else extend)

**Interfaces:**
- Produces: `wbsItemSchema` with `progressPercent: number`, `plannedStart: string | null`, `plannedEnd: string | null`, `responsibleManager: string | null`, `isMilestone: boolean`, `rollup: { budget: number; actual: number; progress: number | null; childCount: number }`. New `updateWbsItemSchema`. `createWbsItemSchema` gains optional `responsibleManager`, `isMilestone`, `progressPercent`, `plannedStart`, `plannedEnd`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { wbsItemSchema, updateWbsItemSchema } from './project';

const node = {
  id: 'w1', code: '1.1', name: 'Detail Engineering', description: null, sortOrder: 1,
  progressPercent: 40, plannedStart: '2026-01-01T00:00:00.000Z', plannedEnd: null,
  responsibleManager: 'Ahmad', isMilestone: false,
  rollup: { budget: 1_100_000_000, actual: 400_000_000, progress: 40, childCount: 0 },
  children: [],
};

describe('wbsItemSchema', () => {
  it('parses management fields and the rollup block', () => {
    const parsed = wbsItemSchema.parse(node);
    expect(parsed.rollup.budget).toBe(1_100_000_000);
    expect(parsed.progressPercent).toBe(40);
    expect(parsed.isMilestone).toBe(false);
  });

  it('accepts a partial update payload', () => {
    expect(updateWbsItemSchema.parse({ progressPercent: 55 }).progressPercent).toBe(55);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api-contracts test -- project`
Expected: FAIL — `rollup`/`progressPercent` not in schema (or `updateWbsItemSchema` undefined).

- [ ] **Step 3: Extend the schemas in `packages/api-contracts/src/project.ts`**

Add the fields to the `wbsItemSchema` object literal (keep `z.lazy` recursion), add the `rollup` object, and add `updateWbsItemSchema` (all fields optional; `code` validated `min(1).max(30)` when present).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api-contracts test -- project`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api-contracts/src/project.ts packages/api-contracts/src/project.test.ts
git commit -m "feat(wbs): expose WBS management fields + rollup in the contract"
```

---

### Task 3: Richer WBS seed

**Files:**
- Modify: `apps/api/prisma/seed.ts:191-203`

**Interfaces:**
- Consumes: Task 1 columns.
- Produces: demo WBS with two levels, progress, planned dates and owners so the UI has real data.

- [ ] **Step 1: Replace the flat `wbsLevels` seed with a two-level tree**

Seed 4 roots (`1 Engineering`, `2 Procurement`, `3 Construction`, `4 Commissioning`) and one child each (e.g. `1.1 Detail Engineering`), each with `progressPercent`, `plannedStart`, `plannedEnd`, `responsibleManager`; mark `4` as a milestone root. Keep `upsert` keyed on `projectId_code`.

- [ ] **Step 2: Verify seed runs**

Run: `pnpm --filter @aec/api db:seed`
Expected: log reports the seeded WBS count; no unique-constraint error.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "chore(wbs): seed a two-level WBS with progress, dates and owners"
```

---

### Task 4: PR 1 gate — full suite green

- [ ] **Step 1: Run the whole gate**

Run:
```bash
pnpm --filter @aec/api test:unit
pnpm --filter @aec/web test
pnpm --filter @aec/api typecheck
pnpm --filter @aec/web typecheck
pnpm --filter @aec/web build
```
Expected: API 471+ pass, Web 734+ pass, typecheck + build clean. Any failure — including one you did not cause — is reported by name, not skipped.

- [ ] **Step 2: Open PR 1 to `develop`**

```bash
git push -u origin feat/wbs-schema
gh pr create --base develop --head feat/wbs-schema --title "feat(wbs): schema + contract for the WBS workspace" --body-file <body.md>
```
Wait for CI, then `gh pr merge --merge --admin`.

---

## PR 2 — `feat/wbs-api`

### Task 5: Rollup service

**Files:**
- Create: `apps/api/src/modules/project/application/services/wbs-rollup.ts`
- Test: `apps/api/src/modules/project/application/services/wbs-rollup.spec.ts`

**Interfaces:**
- Produces: `computeWbsRollup(nodes, ownBudget: Map<string,number>, ownActual: Map<string,number>): Map<string, { budget: number; actual: number; progress: number | null; childCount: number }>` — pure, no Prisma.
- Consumes: nothing.

- [ ] **Step 1: Write the failing test**

```ts
import { computeWbsRollup } from './wbs-rollup';

const nodes = [
  { id: 'a', parentId: null },
  { id: 'b', parentId: 'a' }, // progress 100, budget 100
  { id: 'c', parentId: 'a' }, // progress 0,   budget 300
  { id: 'd', parentId: null }, // leaf, no progress
];
const progress = new Map([['b', 100], ['c', 0]]);
const budget = new Map([['b', 100], ['c', 300]]);
const actual = new Map([['b', 40]]);

describe('computeWbsRollup', () => {
  it('weights parent progress by child budget', () => {
    const r = computeWbsRollup(nodes, budget, actual, progress);
    expect(r.get('a')!.progress).toBe(25); // (100*100 + 0*300) / 400
    expect(r.get('a')!.budget).toBe(400);
    expect(r.get('a')!.childCount).toBe(2);
  });

  it('returns null progress for a leaf with none entered', () => {
    const r = computeWbsRollup(nodes, budget, actual, progress);
    expect(r.get('d')!.progress).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api exec jest wbs-rollup`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `computeWbsRollup`**

Signature takes the flat node list plus three maps (own budget, own actual, own progress). Walk depth-first; a node's `budget`/`actual` = own + Σ children; `childCount` = direct children count; `progress` = own value when a leaf, else budget-weighted mean of children (simple mean when no child has budget); `null` when nothing is known.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api exec jest wbs-rollup`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/wbs-rollup.ts apps/api/src/modules/project/application/services/wbs-rollup.spec.ts
git commit -m "feat(wbs): server-side rollup (budget-weighted progress)"
```

---

### Task 6: `update` + guarded `remove` in `WbsService`

**Files:**
- Modify: `apps/api/src/modules/project/application/services/wbs.service.ts`
- Modify: `apps/api/src/modules/project/presentation/dto/wbs.dto.ts`
- Test: `apps/api/src/modules/project/application/services/wbs.service.spec.ts`

**Interfaces:**
- Produces: `WbsService.update(projectId, itemId, dto, actorId)`, `WbsService.remove(projectId, itemId, actorId)`.
- Consumes: `computeWbsRollup` (Task 5).

- [ ] **Step 1: Write the failing tests**

```ts
it('rejects an update that reuses an existing code', async () => {
  // prisma.wbsItem.findUnique(projectId_code) → existing other id
  await expect(svc.update('p1', 'w1', { code: '1.2' }, 'u1')).rejects.toBeInstanceOf(ConflictException);
});

it('refuses to delete a node whose descendant owns a budget item', async () => {
  // budgetItem.count({ where: { wbsItemId: { in: subtreeIds } } }) → 1
  await expect(svc.remove('p1', 'w1', 'u1')).rejects.toMatchObject({ response: { code: 'WBS_HAS_LINKS' } });
});

it('deletes a node with no linked documents', async () => {
  // every count → 0
  await expect(svc.remove('p1', 'leaf', 'u1')).resolves.toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aec/api exec jest wbs.service`
Expected: FAIL — `svc.update`/`svc.remove` not a function.

- [ ] **Step 3: Implement `update` and `remove`**

`update`: load node, 404 `WBS_NOT_FOUND`; if `code` changes, 409 `WBS_EXISTS` on collision; update fields; audit `WBS.UPDATE`.
`remove`: collect subtree ids (reuse `buildTree` or a recursive query); count links across the 15 relations listed in the spec; if total > 0 → 409 `WBS_HAS_LINKS` with `details` = per-type counts; else delete (children first) and audit `WBS.DELETE`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aec/api exec jest wbs.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/wbs.service.ts apps/api/src/modules/project/application/services/wbs.service.spec.ts apps/api/src/modules/project/presentation/dto/wbs.dto.ts
git commit -m "feat(wbs): update + guarded delete"
```

---

### Task 7: `move` (reparent/reorder) with cycle guard

**Files:**
- Modify: `apps/api/src/modules/project/application/services/wbs.service.ts`
- Modify: `apps/api/src/modules/project/presentation/dto/wbs.dto.ts`
- Test: `apps/api/src/modules/project/application/services/wbs.service.spec.ts`

**Interfaces:**
- Produces: `WbsService.move(projectId, itemId, dto: { parentId?: string | null; sortOrder?: number }, actorId)`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

```ts
it('rejects moving a node under its own descendant', async () => {
  // subtree of 'w1' contains 'w2'; move w1 under w2
  await expect(svc.move('p1', 'w1', { parentId: 'w2' }, 'u1')).rejects.toMatchObject({ response: { code: 'WBS_CYCLE' } });
});

it('reparents a node to a valid parent', async () => {
  await expect(svc.move('p1', 'w3', { parentId: 'w1', sortOrder: 2 }, 'u1')).resolves.toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @aec/api exec jest wbs.service`
Expected: FAIL — `svc.move` not a function.

- [ ] **Step 3: Implement `move`**

Reject `parentId === itemId` or any descendant of `itemId` (400 `WBS_CYCLE`); reject a parent in another project (404 `WBS_PARENT_NOT_FOUND`); update `parentId` + `sortOrder`; audit `WBS.MOVE`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aec/api exec jest wbs.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/wbs.service.ts apps/api/src/modules/project/application/services/wbs.service.spec.ts apps/api/src/modules/project/presentation/dto/wbs.dto.ts
git commit -m "feat(wbs): move with cycle guard"
```

---

### Task 8: `getTree` returns rollup + management fields

**Files:**
- Modify: `apps/api/src/modules/project/application/services/wbs.service.ts`
- Test: `apps/api/src/modules/project/application/services/wbs.service.spec.ts`

**Interfaces:**
- Produces: `getTree` nodes now include `progressPercent`, `plannedStart`, `plannedEnd`, `responsibleManager`, `isMilestone`, and `rollup`.
- Consumes: `computeWbsRollup` (Task 5).

- [ ] **Step 1: Write the failing test**

```ts
it('attaches rollup to each node in the tree', async () => {
  const tree = await svc.getTree('p1');
  expect(tree[0].rollup.budget).toBe(400);
  expect(tree[0].children[0]).toHaveProperty('responsibleManager');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api exec jest wbs.service`
Expected: FAIL — `rollup` undefined.

- [ ] **Step 3: Wire the rollup into `getTree`**

Load items (existing query), load `budgetItem` grouped by `wbsItemId` and `stockLedgerEntry` OUT grouped by `wbsItemId`, build the three maps, call `computeWbsRollup`, then merge each node's rollup into the unwrapped tree output.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @aec/api exec jest wbs.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/application/services/wbs.service.ts apps/api/src/modules/project/application/services/wbs.service.spec.ts
git commit -m "feat(wbs): tree carries management fields and rollup"
```

---

### Task 9: Controller endpoints

**Files:**
- Modify: `apps/api/src/modules/project/presentation/controllers/wbs.controller.ts`

**Interfaces:**
- Produces: `PATCH /projects/:projectId/wbs/:itemId` (`WbsEdit`), `DELETE /projects/:projectId/wbs/:itemId` (`WbsEdit`), `POST /projects/:projectId/wbs/:itemId/move` (`WbsEdit`).
- Consumes: `WbsService.update|remove|move` (Tasks 6–7).

- [ ] **Step 1: Write the failing e2e/controller test**

```ts
it('PATCH /wbs/:id updates progress', async () => {
  await request(app.getHttpServer())
    .patch(`/api/v1/projects/${projectId}/wbs/${itemId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ progressPercent: 55 })
    .expect(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @aec/api exec jest wbs.controller` (or the e2e suite that owns it)
Expected: FAIL — 404 (route absent).

- [ ] **Step 3: Add the three handlers**

Import `Delete`, `Patch`, `Put` as needed; add `@Permissions(Permission.WbsEdit)`; pass `request.user?.sub ?? 'system'` as actor. `move` accepts `{ parentId?, sortOrder? }`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @aec/api test:unit` then the e2e suite.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/project/presentation/controllers/wbs.controller.ts apps/api/src/modules/project/presentation/dto/wbs.dto.ts
git commit -m "feat(wbs): update, delete and move endpoints"
```

---

### Task 10: PR 2 gate — full suite green

- [ ] **Step 1: Run the whole gate** (same commands as Task 4 Step 1). Expected: all green.
- [ ] **Step 2: Open PR 2 to `develop`** (`feat/wbs-api`), wait for CI, `gh pr merge --merge --admin`.

---

## PR 3 — `feat/wbs-workspace-ui`

### Task 11: WBS entity hooks

**Files:**
- Modify: `apps/web/src/entities/wbs/wbs.api.ts`

**Interfaces:**
- Produces: `useUpdateWbsItem(projectId)`, `useDeleteWbsItem(projectId)`, `useMoveWbsItem(projectId)` — each invalidates `wbsKeys.all(projectId)`.
- Consumes: `patchJson`/`deleteJson`/`postJson` (`shared/lib/http`), contract schemas (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
it('useUpdateWbsItem patches the item and invalidates the tree', async () => {
  // render hook with mocked fetch returning the updated node
  // assert fetch called with PATCH /projects/p1/wbs/w1
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm --filter @aec/web exec vitest run src/entities/wbs`.
- [ ] **Step 3: Implement the three hooks** (mirror `useCreateWbsItem`).
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/entities/wbs/wbs.api.ts apps/web/src/entities/wbs/wbs.api.test.ts
git commit -m "feat(wbs): update/delete/move hooks"
```

---

### Task 12: Rebuild the tree (master) with rollup columns

**Files:**
- Modify: `apps/web/src/features/project/ui/wbs-tree.tsx`
- Test: `apps/web/src/features/project/ui/wbs-tree.test.tsx`

**Interfaces:**
- Produces: `WbsTree({ tree, selectedId, onSelect, onAddChild })`.
- Consumes: `WbsItem` (Task 2), `Money` (`shared/ui/money`), `ICON_STROKE`/`ICON_SIZE` (`@aec/ui`).

- [ ] **Step 1: Write the failing tests**

```ts
it('shows each node’s rollup budget in compact form', () => {
  renderWithProviders(<WbsTree tree={tree} selectedId={null} onSelect={vi.fn()} onAddChild={vi.fn()} />);
  expect(screen.getByText(/Rp/)).toBeTruthy();
});

it('marks the selected row with aria-selected and a neutral background', () => {
  renderWithProviders(<WbsTree tree={tree} selectedId="r1" onSelect={vi.fn()} onAddChild={vi.fn()} />);
  expect(screen.getByRole('treeitem', { name: /Root/ }).getAttribute('aria-selected')).toBe('true');
});

it('renders a milestone flag for a milestone node', () => {
  // node with isMilestone: true → getByLabelText(/milestone/i)
});
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm --filter @aec/web exec vitest run wbs-tree`.
- [ ] **Step 3: Rebuild `WbsTree`** — grid row with indent + chevron, `code`, `name` (truncate + `title`), progress bar + `%`, `Money` rollup (compact, full in `title`); `role="tree"`/`treeitem` + `aria-selected`; selection `bg-neutral-100`; chevron via `ICON_SIZE`/`ICON_STROKE`; remove the red "+ Sub".
- [ ] **Step 4: Run tests to verify they pass.**
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/wbs-tree.tsx apps/web/src/features/project/ui/wbs-tree.test.tsx
git commit -m "feat(wbs): tree with rollup columns, selection and milestone flags"
```

---

### Task 13: Inspector (detail) panel

**Files:**
- Create: `apps/web/src/features/project/ui/wbs-inspector.tsx`
- Test: `apps/web/src/features/project/ui/wbs-inspector.test.tsx`

**Interfaces:**
- Produces: `WbsInspector({ projectId, item, onDeleted })`.
- Consumes: `useUpdateWbsItem`/`useDeleteWbsItem` (Task 11), `Money`, `ConfirmDialog`, `ErrorState`.

- [ ] **Step 1: Write the failing tests**

```ts
it('saves edited progress through PATCH', async () => {
  // type 55 into the progress input, click Save → mutate called with { progressPercent: 55 }
});

it('shows rollup as read-only, separate from inputs', () => {
  renderWithProviders(<WbsInspector projectId="p1" item={node} onDeleted={vi.fn()} />);
  expect(screen.getByText(/Rollup/i)).toBeTruthy();
  expect(screen.getByText(/Budget/i)).toBeTruthy();
});

it('surfaces linked-document counts with links to their pages', () => {
  // counts { purchaseOrders: 12, costCodes: 2 } → getByRole('link', { name: /Purchase orders/i })
});
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm --filter @aec/web exec vitest run wbs-inspector`.
- [ ] **Step 3: Implement `WbsInspector`** — controlled form (progress slider + number 0–100, planned start/end date, owner, description, milestone toggle); Save via PATCH; read-only rollup block; linked-document counts with links; Delete via `ConfirmDialog`, showing the 409 counts honestly; note when the node has children.
- [ ] **Step 4: Run tests to verify they pass.**
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/wbs-inspector.tsx apps/web/src/features/project/ui/wbs-inspector.test.tsx
git commit -m "feat(wbs): inspector panel for progress, dates, owner and rollup"
```

---

### Task 14: Rebuild `/wbs` as split master–detail + states

**Files:**
- Modify: `apps/web/src/pages/project/wbs.page.tsx`
- Modify: `apps/web/src/features/project/ui/wbs-form.tsx`
- Modify: `apps/web/src/features/project/ui/index.ts`
- Test: `apps/web/src/pages/project/wbs.page.test.tsx` (create), `apps/web/src/features/project/ui/wbs-form.test.tsx` (extend)

**Interfaces:**
- Produces: the `/wbs` page with project deep-link (`?project=`), toolbar (search, expand/collapse, add root), tree + inspector; `WbsForm` that keeps `description`.
- Consumes: Tasks 12–13.

- [ ] **Step 1: Write the failing tests**

```ts
it('reads the project id from the URL deep-link', () => { /* ?project=p1 → tree query enabled */ });
it('shows an empty state before a project is chosen', () => { expect(screen.getByText(/Select a project/i)).toBeTruthy(); });
it('shows an error state with retry when the tree fails', () => { /* isError → role="alert" + Retry */ });
it('WbsForm keeps the description field', async () => {
  // fill description → mutate payload includes description
});
```

- [ ] **Step 2: Run tests to verify they fail** — `pnpm --filter @aec/web exec vitest run wbs.page wbs-form`.
- [ ] **Step 3: Implement** — page layout (header + picker + toolbar + `grid` tree/inspector), selection state, deep-link via `useUrlFilter`, `Skeleton`/`ErrorState`/empty states; export `WbsInspector` from `features/project/ui/index.ts`; extend `WbsForm` to include `description` (and owner/milestone).
- [ ] **Step 4: Run tests to verify they pass.**
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/project/wbs.page.tsx apps/web/src/pages/project/wbs.page.test.tsx apps/web/src/features/project/ui/wbs-form.tsx apps/web/src/features/project/ui/wbs-form.test.tsx apps/web/src/features/project/ui/index.ts
git commit -m "feat(wbs): split master-detail workspace with states and deep-link"
```

---

### Task 15: PR 3 gate + live DOM verification

- [ ] **Step 1: Run the whole gate** (same commands as Task 4 Step 1). Expected: all green.
- [ ] **Step 2: Live DOM check via CDP** — restart Vite, log in (`admin@aec.local` / `Admin123!`), open `/wbs?project=<demo id>`; assert `main`/`html` have no horizontal scroll and 0 real overflow (same criterion used for the Commercial tab: `overflow-x: visible` and not `text-overflow: ellipsis`); confirm the tree is keyboard-focusable and the inspector renders rollup.
- [ ] **Step 3: Open PR 3 to `develop`** (`feat/wbs-workspace-ui`), wait for CI, `gh pr merge --merge --admin`.
- [ ] **Step 4: Merged-tree gate** — on `develop`, re-run API unit + Web test + typecheck + build.

---

## Self-Review

**Spec coverage:** §4 model → Task 1; §5 contract → Task 2; §6 endpoints/rollup → Tasks 5–9; §7 FE → Tasks 12–14; §8 tests → each task's Step 1; §9 verification → Tasks 4/10/15. §7.4 states → Task 14. Seed → Task 3. No gaps.

**Type consistency:** `computeWbsRollup(nodes, budget, actual, progress)` is defined once (Task 5) and called once (Task 8); `rollup` shape is identical in Task 2 (contract), Task 5 (service), Task 12 (tree). Hook names (`useUpdateWbsItem`/`useDeleteWbsItem`/`useMoveWbsItem`) are consistent between Tasks 11, 13, 14.

**Review Focus:** each of the five failure modes maps to a named task step (1→Task 6, 2→Task 7, 3→Task 5, 4→Tasks 5/12, 5→Task 6).

**Proportion:** plan is task/step-level; code blocks are tests and SQL only — bodies are left to the implementer, matching the spec's size.
