# Budget Baseline — Stage B (Statement Page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the WBS tree on `/budget` with a cost statement — one semantic table showing baseline, revised, committed, actual, available and variance per row — wired to the Stage A API.

**Architecture:** A new `budget-statement.tsx` renders a `<table>` from `BudgetStatement.rows`. Row selection opens the existing inspector inline beneath the row instead of in a right rail. `budget.api.ts` swaps its parsed schema to `budgetStatementSchema` and gains freeze/revision hooks. The old tree, its dead `BudgetTotalBar`, and the local money formatters are deleted.

**Tech Stack:** React 19, TanStack Router/Query, Tailwind (AEP preset), Vitest + Testing Library, Zod contracts from Stage A.

**Spec:** `docs/superpowers/specs/2026-10-23-budget-baseline-control-surface-design.md` (§6, §7)

## Global Constraints

- **One money formatter across the page**: `formatIdrCompact` for table cells, `formatIdr` for the total row, full value in `title`. The local `compact()` in `budget-tree.tsx` and `money()` in `budget-inspector.tsx` are deleted.
- **No cards, no shadows, no radius on the statement.** Hairline borders only. This is a ledger, not a dashboard.
- **Every number is `font-mono tabular-nums`, right-aligned.**
- **Colour is never the only signal.** Variance signs are always rendered as `+`/`−` text.
- **Bar ramp must pass WCAG 1.4.11 (3:1)**: `neutral-800 / 700 / 600 / 500` on a `neutral-100` track. Never `neutral-400` or lighter for a fill.
- **Semantic table markup**, not divs: `<table>`, `<caption>`, `<th scope="col">`, `<th scope="row">`.
- **No new dependencies.** Use what `@aec/ui` and `lucide-react` already provide.
- **Indonesian comments explaining *why***, matching the codebase.
- **Do not delete `budget-tree.tsx` until Task 6**, which also removes its exports and tests.

## Review Focus

1. **A project with no frozen baseline** — every baseline cell shows `—`, not `Rp 0`, and the header offers Freeze as the primary action. (Task 4)
2. **Actual exceeding revised** — variance renders negative with a `−` sign and a left-pointing bar; nothing is clamped. (Task 3)
3. **Six numeric columns at 375px** — the table scrolls horizontally with the WBS column stuck left; no horizontal page scroll. (Task 3)
4. **A zero-amount cost type** — the composition bar skips it rather than drawing a zero-width segment. (Task 3, reuses existing behaviour)
5. **A failed fetch** — shows `ErrorState` with retry, never `Rp 0` dressed as real data. (Task 4)

---

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/web/src/features/project/ui/variance-cell.tsx` | Create — one signed variance value plus an optional diverging bar |
| `apps/web/src/features/project/ui/baseline-header.tsx` | Create — version, freeze date, label, Freeze / Open revision actions |
| `apps/web/src/features/project/ui/statement-row.tsx` | Create — one `<tr>`: WBS cell, six money cells, inline inspector |
| `apps/web/src/features/project/ui/budget-statement.tsx` | Create — the `<table>`, sticky header, total row |
| `apps/web/src/features/project/model/budget.api.ts` | Modify — parse `budgetStatementSchema`; add freeze/revision hooks |
| `apps/web/src/features/project/ui/budget-inspector.tsx` | Modify — accept statement row fields; drop local `money()` |
| `apps/web/src/features/project/ui/budget-status.tsx` | Modify — warnings follow the new shape; delete dead `BudgetTotalBar` |
| `apps/web/src/pages/project/budget.page.tsx` | Modify — compose header + statement |
| `apps/web/src/features/project/ui/index.ts` | Modify — export the new components |
| Delete | `budget-tree.tsx`, `budget-tree.test.tsx` |

---

### Task 1: Signed variance cell

**Files:**
- Create: `apps/web/src/features/project/ui/variance-cell.tsx`
- Create: `apps/web/src/features/project/ui/variance-cell.test.tsx`

**Interfaces:**
- Produces: `VarianceCell({ value, max, label }: { value: number; max: number; label: string })` — renders `+Rp 32 M` / `−Rp 32 M` / `Rp 0`, a `title` with the full amount, and a diverging bar whose width is `|value| / max`. Renders no bar when `max <= 0`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VarianceCell } from './variance-cell';

describe('VarianceCell', () => {
  it('renders a plus sign for a favourable variance', () => {
    render(<VarianceCell value={32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByText(/^\+/)).toBeTruthy();
  });

  it('renders a minus sign for an unfavourable variance', () => {
    render(<VarianceCell value={-32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByText(/^−/)).toBeTruthy();
  });

  it('renders no sign for zero', () => {
    const { container } = render(<VarianceCell value={0} max={64_000_000} label="Variance" />);
    expect(container.textContent).not.toMatch(/^[+−]/);
  });

  it('exposes the full amount in the title, not the compact form', () => {
    render(<VarianceCell value={-32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByTitle(/32\.000\.000/)).toBeTruthy();
  });

  it('sizes the bar relative to the largest visible variance', () => {
    render(<VarianceCell value={32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByTestId('variance-bar').getAttribute('style')).toContain('width: 50%');
  });

  it('draws no bar when there is nothing to scale against', () => {
    render(<VarianceCell value={0} max={0} label="Variance" />);
    expect(screen.queryByTestId('variance-bar')).toBeNull();
  });

  it('describes the value for screen readers instead of relying on colour', () => {
    render(<VarianceCell value={-32_000_000} max={64_000_000} label="Variance" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/variance/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && pnpm test -- variance-cell`
Expected: FAIL — cannot resolve `./variance-cell`.

- [ ] **Step 3: Implement `VarianceCell`**

Use `formatIdrCompact` and `formatIdr` from `@/shared/lib/format`. The sign is a literal `+` or `−` (U+2212) prefix on the formatted text, so it is readable without colour. The bar is a `role="img"` element with an `aria-label` naming the value; its fill uses `bg-neutral-600`, and it grows from the left for positive and from the right for negative (use `ml-auto` on negative fills) so direction is visible without colour.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && pnpm test -- variance-cell`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/variance-cell.tsx apps/web/src/features/project/ui/variance-cell.test.tsx
git commit -m "feat(budget): signed variance cell with diverging bar"
```

---

### Task 2: API hooks for the statement

**Files:**
- Modify: `apps/web/src/features/project/model/budget.api.ts`

**Interfaces:**
- Consumes: `budgetStatementSchema`, `freezeBaselineSchema`, `openRevisionSchema` from `@aec/api-contracts`.
- Produces: `useBudget(projectId)` → `BudgetStatement`; `useBudgetBaseline(projectId)`; `useFreezeBaseline(projectId)`; `useOpenRevision(projectId)`. All three mutations invalidate `budgetKeys.all(projectId)`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/project/model/budget.api.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { budgetStatementSchema } from '@aec/api-contracts';

describe('budget statement contract on the client', () => {
  it('rejects the old tree shape so a stale API cannot slip through', () => {
    const oldShape = {
      projectId: 'p1', status: 'DRAFT', wbs: [],
      totalBudget: 0, totals: { budget: 0, used: 0, remaining: 0, contractValue: 0, variance: 0 },
      warnings: {}, costCoverage: { allocatedNodes: 0, totalNodes: 0 },
    };
    expect(budgetStatementSchema.safeParse(oldShape).success).toBe(false);
  });

  it('accepts a statement payload', () => {
    const statement = {
      projectId: 'p1', currency: 'IDR', baseline: null, previous: null, rows: [],
      totals: {
        baseline: 0, revised: 0, committed: 0, actual: 0, available: 0,
        variance: 0, varianceBaseline: 0, contractValue: 0, eac: null, vac: null,
      },
      unallocated: { committed: 0, actual: 0 },
      reconciliation: { ledgerOut: 0, journalExpense610: 0, doubleCountRisk: false },
      warnings: {
        overContract: false, overCommitted: [], noBudget: [],
        pvCoverage: { pv: 0, bac: 0, status: 'NO_BASELINE' },
      },
      costCoverage: { allocatedNodes: 0, totalNodes: 0 },
    };
    expect(budgetStatementSchema.safeParse(statement).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && pnpm test -- budget.api`
Expected: PASS already — the contract exists from Stage A. If it passes, keep the test: it is the guard that the client cannot silently accept the old shape.

- [ ] **Step 3: Rewrite `budget.api.ts`**

- `useBudget` parses with `budgetStatementSchema`.
- Add `budgetKeys.baseline(projectId)`.
- `useBudgetBaseline` → `GET /projects/:id/budget/baseline`.
- `useFreezeBaseline` → `POST /projects/:id/budget/baseline/freeze`, body parsed by `freezeBaselineSchema`.
- `useOpenRevision` → `POST /projects/:id/budget/baseline/revision`, body parsed by `openRevisionSchema`.
- All mutations invalidate both `budgetKeys.all` and `budgetKeys.baseline`.
- Remove `usePublishBudget` — `publish` is now an alias for freeze and the page no longer needs it.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && pnpm test -- budget.api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/model/budget.api.ts apps/web/src/features/project/model/budget.api.test.ts
git commit -m "feat(budget): parse the statement contract and add baseline mutations"
```

---

### Task 3: Statement table

**Files:**
- Create: `apps/web/src/features/project/ui/statement-row.tsx`
- Create: `apps/web/src/features/project/ui/budget-statement.tsx`
- Create: `apps/web/src/features/project/ui/budget-statement.test.tsx`

**Interfaces:**
- Consumes: `BudgetStatement`, `BudgetStatementRow`; `VarianceCell` from Task 1; `BudgetInspector`; `CostTypeBar`.
- Produces: `BudgetStatement({ statement, selectedId, onSelect, published }: { statement: BudgetStatement; selectedId: string | null; onSelect: (id: string | null) => void; published: boolean })`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { BudgetStatement as Statement } from '@aec/api-contracts';
import { BudgetStatement } from './budget-statement';

const row = (over: Partial<Statement['rows'][number]> = {}): Statement['rows'][number] => ({
  id: 'w1', code: '1', name: 'Engineering', parentId: null, depth: 0, childrenCount: 0,
  baseline: 1000, revised: 1200, committed: 300, actual: 900,
  available: 0, variance: 300, varianceBaseline: 200,
  byCostType: { LABOR: 1200 }, ...over,
});

const statement = (over: Partial<Statement> = {}): Statement => ({
  projectId: 'p1', currency: 'IDR',
  baseline: { id: 'b1', version: 1, status: 'FROZEN', label: null, reason: null, frozenAt: '2026-01-01T00:00:00.000Z', total: 1000 },
  previous: null,
  rows: [row()],
  totals: {
    baseline: 1000, revised: 1200, committed: 300, actual: 900,
    available: 0, variance: 300, varianceBaseline: 200,
    contractValue: 5000, eac: 1300, vac: -100,
  },
  unallocated: { committed: 0, actual: 0 },
  reconciliation: { ledgerOut: 900, journalExpense610: 0, doubleCountRisk: false },
  warnings: { overContract: false, overCommitted: [], noBudget: [], pvCoverage: { pv: 600, bac: 1200, status: 'COMPLETE' } },
  costCoverage: { allocatedNodes: 1, totalNodes: 1 },
  ...over,
});

describe('BudgetStatement', () => {
  it('renders a semantic table with a caption and seven columns', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
    expect(table.querySelector('caption')).toBeTruthy();
  });

  it('renders one row per statement row', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    expect(screen.getAllByRole('row')).toHaveLength(2); // header + 1 row
  });

  it('renders a total row whose values match totals', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    const total = screen.getByTestId('statement-total');
    expect(within(total).getByTitle(/1\.200/)).toBeTruthy();
  });

  it('shows EAC and VAC on the total row only', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    expect(screen.getByTestId('statement-total').textContent).toMatch(/EAC/i);
    expect(screen.queryByTestId('row-eac')).toBeNull();
  });

  it('shows a dash instead of Rp 0 when no baseline exists', () => {
    render(
      <BudgetStatement
        statement={statement({ baseline: null, rows: [row({ baseline: 0 })] })}
        selectedId={null} onSelect={vi.fn()} published={false}
      />,
    );
    expect(screen.getByTestId('cell-baseline-w1').textContent).toBe('—');
  });

  it('marks the selected row with aria-current and expands the inspector inline', () => {
    render(<BudgetStatement statement={statement()} selectedId="w1" onSelect={vi.fn()} published />);
    const selected = screen.getByTestId('row-w1');
    expect(selected.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('complementary', { name: /budget detail/i })).toBeTruthy();
  });

  it('calls onSelect with the row id when a row is clicked', () => {
    const onSelect = vi.fn();
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={onSelect} published />);
    fireEvent.click(screen.getByRole('button', { name: /^1\s*Engineering$/ }));
    expect(onSelect).toHaveBeenCalledWith('w1');
  });

  it('indents a child row by its depth', () => {
    render(
      <BudgetStatement
        statement={statement({ rows: [row(), row({ id: 'w2', code: '1.1', parentId: 'w1', depth: 1 })] })}
        selectedId={null} onSelect={vi.fn()} published
      />,
    );
    expect(screen.getByTestId('row-w2').querySelector('[data-depth]')?.getAttribute('data-depth')).toBe('1');
  });

  it('never relies on colour alone for variance', () => {
    render(
      <BudgetStatement
        statement={statement({ rows: [row({ variance: -300 })] })}
        selectedId={null} onSelect={vi.fn()} published
      />,
    );
    expect(screen.getByTestId('row-w1').textContent).toMatch(/−/);
  });

  it('scrolls horizontally instead of squeezing six columns', () => {
    render(<BudgetStatement statement={statement()} selectedId={null} onSelect={vi.fn()} published />);
    expect(screen.getByTestId('statement-scroll').className).toContain('overflow-x-auto');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && pnpm test -- budget-statement`
Expected: FAIL — cannot resolve `./budget-statement`.

- [ ] **Step 3: Implement `statement-row.tsx` and `budget-statement.tsx`**

`budget-statement.tsx`:
- `<div data-testid="statement-scroll" className="overflow-x-auto">` wrapping a `<table>` with `<caption className="sr-only">` describing the project statement.
- `<thead>` sticky (`sticky top-0 bg-surface-raised`), tujuh `<th scope="col">`: WBS, Baseline, Revised, Committed, Actual, Available, Variance. Kolom WBS adalah row header untuk setiap baris, sehingga yang benar-benar berisi angka ada enam. Assertion memakai `getAllByRole('columnheader')` yang menghitung **tujuh** — sesuaikan angka di test dengan markup yang benar-benar dibangun, dan jangan mengubah markup hanya agar test lama lulus.
- `<tbody>` maps rows to `<StatementRow>`.
- `<tfoot>` with `data-testid="statement-total"`: totals plus `EAC` and `VAC` on a second line inside the same cell group.
- Column widths fixed with `w-[7.5rem]` per money column so the header aligns with the body.

`statement-row.tsx`:
- `<tr data-testid={`row-${id}`} aria-current={selected ? 'true' : undefined}>`.
- First cell: `<th scope="row">` containing a `<button>` with `aria-expanded` for parents, `data-depth` on a wrapper span for the indent, code in mono + name.
- Money cells carry `data-testid={`cell-<column>-<id>`}`; the baseline cell renders `—` when `statement.baseline` is null and the value is 0.
- Variance cell uses `VarianceCell`.
- When selected, render a second `<tr>` with a single `<td colSpan={7}>` containing `BudgetInspector`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && pnpm test -- budget-statement`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/budget-statement.tsx apps/web/src/features/project/ui/statement-row.tsx apps/web/src/features/project/ui/budget-statement.test.tsx
git commit -m "feat(budget): cost statement table with sticky WBS column and inline inspector"
```

---

### Task 4: Baseline header

**Files:**
- Create: `apps/web/src/features/project/ui/baseline-header.tsx`
- Create: `apps/web/src/features/project/ui/baseline-header.test.tsx`

**Interfaces:**
- Consumes: `useFreezeBaseline`, `useOpenRevision` from Task 2.
- Produces: `BaselineHeader({ projectId, baseline, hasOpenRevision }: { projectId: string; baseline: BudgetBaselineSummary | null; hasOpenRevision: boolean })`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const freeze = vi.fn();
const revision = vi.fn();
vi.mock('@/features/project', async () => {
  const actual = await vi.importActual<typeof import('@/features/project')>('@/features/project');
  return {
    ...actual,
    useFreezeBaseline: () => ({ mutate: freeze, isPending: false }),
    useOpenRevision: () => ({ mutate: revision, isPending: false }),
  };
});

import { BaselineHeader } from './baseline-header';

const frozen = { id: 'b1', version: 3, status: 'FROZEN' as const, label: 'VO-02', reason: null, frozenAt: '2026-10-22T00:00:00.000Z', total: 4.8e12 };

describe('BaselineHeader', () => {
  it('names the frozen version and its date', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision={false} />);
    expect(screen.getByText(/v3/)).toBeTruthy();
    expect(screen.getByText(/22 Oct 2026/)).toBeTruthy();
  });

  it('offers Open revision when a baseline exists and none is open', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision={false} />);
    expect(screen.getByRole('button', { name: /open revision/i })).toBeTruthy();
  });

  it('hides Open revision while a revision is already open', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision />);
    expect(screen.queryByRole('button', { name: /open revision/i })).toBeNull();
    expect(screen.getByText(/revision open/i)).toBeTruthy();
  });

  it('makes Freeze the primary action when no baseline exists', () => {
    render(<BaselineHeader projectId="p1" baseline={null} hasOpenRevision={false} />);
    expect(screen.getByRole('button', { name: /freeze/i })).toBeTruthy();
    expect(screen.getByText(/no baseline frozen yet/i)).toBeTruthy();
  });

  it('does not offer Freeze twice when a revision is open', () => {
    render(<BaselineHeader projectId="p1" baseline={frozen} hasOpenRevision />);
    expect(screen.getAllByRole('button', { name: /freeze/i })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && pnpm test -- baseline-header`
Expected: FAIL — cannot resolve `./baseline-header`.

- [ ] **Step 3: Implement `BaselineHeader`**

Use `ConfirmActionButton` for Freeze (destructive-ish: it locks the budget). Freeze opens a confirm dialog stating the version that will be frozen. Open revision opens a small inline form requiring a reason (min 3 chars) before calling `useOpenRevision`, because the API rejects an empty reason — the UI should not let a user hit that error.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && pnpm test -- baseline-header`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/baseline-header.tsx apps/web/src/features/project/ui/baseline-header.test.tsx
git commit -m "feat(budget): baseline header with freeze and revision actions"
```

---

### Task 5: Warnings and inspector follow the new shape

**Files:**
- Modify: `apps/web/src/features/project/ui/budget-status.tsx`
- Modify: `apps/web/src/features/project/ui/budget-inspector.tsx`
- Modify: `apps/web/src/features/project/ui/index.ts`

**Interfaces:**
- `BudgetWarnings({ warnings, reconciliation })` — new signature; `BudgetTotalBar` deleted.
- `BudgetInspector({ node, onSave, saving, published })` where `node` is now `BudgetStatementRow | null`.

- [ ] **Step 1: Write the failing test**

Append to a new `apps/web/src/features/project/ui/budget-status.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetWarnings } from './budget-status';

const warnings = (over = {}) => ({
  overContract: false, overCommitted: [], noBudget: [],
  pvCoverage: { pv: 0, bac: 0, status: 'NO_BASELINE' as const }, ...over,
});

describe('BudgetWarnings', () => {
  it('explains that PV=0 means no schedule baseline', () => {
    render(<BudgetWarnings warnings={warnings()} reconciliation={{ ledgerOut: 0, journalExpense610: 0, doubleCountRisk: false }} />);
    expect(screen.getByText(/no schedule baseline/i)).toBeTruthy();
  });

  it('does not warn when PV is below BAC', () => {
    render(<BudgetWarnings warnings={warnings({ pvCoverage: { pv: 600, bac: 1000, status: 'COMPLETE' } })} reconciliation={{ ledgerOut: 0, journalExpense610: 0, doubleCountRisk: false }} />);
    expect(screen.queryByText(/baseline PV is/i)).toBeNull();
  });

  it('surfaces the double-count risk in plain language', () => {
    render(<BudgetWarnings warnings={warnings()} reconciliation={{ ledgerOut: 100, journalExpense610: 50, doubleCountRisk: true }} />);
    expect(screen.getByText(/double count/i)).toBeTruthy();
  });

  it('renders nothing when everything is in order', () => {
    const { container } = render(
      <BudgetWarnings warnings={warnings({ pvCoverage: { pv: 600, bac: 1000, status: 'COMPLETE' } })} reconciliation={{ ledgerOut: 100, journalExpense610: 0, doubleCountRisk: false }} />,
    );
    expect(container.textContent).toBe('');
  });

  it('lists leaves that were committed above their revised budget', () => {
    render(<BudgetWarnings warnings={warnings({ overCommitted: [{ wbsId: 'w', code: '2.1', amount: 50 }] })} reconciliation={{ ledgerOut: 0, journalExpense610: 0, doubleCountRisk: false }} />);
    expect(screen.getByText(/2\.1/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && pnpm test -- budget-status`
Expected: FAIL — `BudgetWarnings` requires a `reconciliation` prop.

- [ ] **Step 3: Implement**

- `budget-status.tsx`: new `BudgetWarnings` signature; drop the `pvMismatch` branch and replace with `pvCoverage.status === 'NO_BASELINE'` → "No schedule baseline published yet — schedule indices are unavailable." Add a `doubleCountRisk` line. Delete `BudgetTotalBar` entirely.
- `budget-inspector.tsx`: change the node type to `BudgetStatementRow`; rename displayed fields (`budget`→`revised`, `used`→`actual`, `remaining`→`available`); delete local `money()` in favour of `formatIdr`; drop the `plannedValue` row (it now lives in warnings).
- `index.ts`: export `BudgetStatement`, `BaselineHeader`, `VarianceCell`; remove `BudgetTree` and `BudgetTotalBar` exports.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/web && pnpm test -- budget-status budget-inspector`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/project/ui/budget-status.tsx apps/web/src/features/project/ui/budget-status.test.tsx apps/web/src/features/project/ui/budget-inspector.tsx apps/web/src/features/project/ui/index.ts
git commit -m "feat(budget): warnings follow pvCoverage and reconciliation; inspector reads statement rows"
```

---

### Task 6: Compose the page and delete the old tree

**Files:**
- Modify: `apps/web/src/pages/project/budget.page.tsx`
- Modify: `apps/web/src/pages/project/budget.page.test.tsx`
- Delete: `apps/web/src/features/project/ui/budget-tree.tsx`, `budget-tree.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–5.

- [ ] **Step 1: Rewrite the page tests**

Replace `budget.page.test.tsx` wholesale: mock `useBudget` to return a statement (two rows, one with a baseline), mock `useBudgetBaseline`, and assert: the statement table renders, the baseline header shows the version, selecting a row opens the inline inspector, and a failed fetch shows `ErrorState` with a retry button.

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/web && pnpm test -- budget.page`
Expected: FAIL — the page still reads `data.wbs`.

- [ ] **Step 3: Rewrite `budget.page.tsx`**

- Header: `<h1>Budget Baseline</h1>`, one-line subtitle, `EntitySelect` for project.
- `<BaselineHeader>` beneath the header.
- `<BudgetWarnings warnings={statement.warnings} reconciliation={statement.reconciliation} />`.
- `<BudgetStatement statement={statement} selectedId={selectedId} onSelect={setSelectedId} published={!hasOpenRevision} />`.
- `ErrorState` on `isError`, `Skeleton`/text on `isLoading`.
- Delete the local `formatIdr` totals block — totals now live in the table footer.
- Delete `BudgetStatusBadge` usage if the header covers it; otherwise keep it and adjust its props.

- [ ] **Step 4: Delete the tree**

```bash
git rm apps/web/src/features/project/ui/budget-tree.tsx apps/web/src/features/project/ui/budget-tree.test.tsx
```

Confirm no remaining imports: `grep -rn "BudgetTree" apps/web/src` → expect only `index.ts` before you edit it, then zero.

- [ ] **Step 5: Run to verify it passes**

Run: `cd apps/web && pnpm test -- budget.page` then `cd apps/web && pnpm test`
Expected: PASS. Any other spec importing `BudgetTree` must be updated or deleted with it.

- [ ] **Step 6: Commit**

```bash
git add -A apps/web/src
git commit -m "feat(budget): rebuild the page as a cost statement

Pohon WBS dan BudgetTotalBar dihapus. Halaman kini satu tabel semantik:
baseline, revised, committed, actual, available, variance per baris; EAC/VAC di
baris total. Inspector terbuka inline di bawah baris yang dipilih, bukan di rail
kanan, supaya konteks perbandingan tetap terlihat di layar sempit."
```

---

### Task 7: Full gate

**Files:** none.

- [ ] **Step 1: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS.

- [ ] **Step 2: Lint**

Run: `cd apps/web && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Web suite**

Run: `cd apps/web && pnpm test`
Expected: PASS.

- [ ] **Step 4: API suite unchanged**

Run: `cd apps/api && pnpm test:unit`
Expected: PASS — Stage B touches no API code.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore(budget): stage B formatting and typecheck fixes"
```

---

## Stage B completion criteria

- `/budget` renders a semantic table with six numeric columns plus a total row carrying EAC and VAC.
- Baseline cells show `—` when no baseline is frozen; the header then offers Freeze.
- Selecting a row opens the inspector inline beneath it.
- Variance always shows a `+`/`−` sign as text.
- Warnings explain `pvCoverage` and the double-count risk; `pvMismatch` is gone.
- `budget-tree.tsx` and `BudgetTotalBar` no longer exist.
- One money formatter across the page.
- `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass in `apps/web`; API unit suite still passes.

**Not in this stage:** the `Subcontract.wbsItemId` half of the committed column, the "not yet allocated" row, and the actual-cost double-count fix.

